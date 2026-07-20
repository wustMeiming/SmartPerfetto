// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

/**
 * Skill Controller
 *
 * Handles HTTP requests for skill-based trace analysis.
 */

import { Request, Response } from 'express';
import { getTraceProcessorService } from '../services/traceProcessorService';
import {
  SkillAnalysisAdapter,
  SkillAnalysisRequest,
  createSkillAnalysisAdapter,
} from '../services/skillEngine/skillAnalysisAdapter';
import { ErrorResponse } from '../types';
import { toSingleString } from '../utils/httpValue';
import {
  localize,
  parseOutputLanguage,
} from '../agentv3/outputLanguage';
import {localizeSkillDefinition} from '../services/skillLocalization';

function requestOutputLanguage(req: Request) {
  return parseOutputLanguage(
    req.body?.outputLanguage ??
    req.query.outputLanguage ??
    req.headers['accept-language'] ??
    process.env.SMARTPERFETTO_OUTPUT_LANGUAGE,
  );
}

class SkillController {
  private adapter: SkillAnalysisAdapter | null = null;

  /**
   * Get or create the adapter instance
   */
  private getAdapter(): SkillAnalysisAdapter {
    if (!this.adapter) {
      const traceProcessor = getTraceProcessorService();
      this.adapter = createSkillAnalysisAdapter(traceProcessor);
    }
    return this.adapter;
  }

  /**
   * List all available skills
   * GET /api/skills
   */
  listSkills = async (req: Request, res: Response) => {
    try {
      const outputLanguage = requestOutputLanguage(req);
      const adapter = this.getAdapter();
      const skills = await adapter.listSkills(outputLanguage);

      res.json({
        skills,
        count: skills.length,
      });
    } catch (error) {
      console.error('[SkillController] Error listing skills:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to list skills',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Get skill details
   * GET /api/skills/:skillId
   */
  getSkillDetail = async (req: Request, res: Response) => {
    try {
      const outputLanguage = requestOutputLanguage(req);
      const skillId = toSingleString(req.params.skillId);

      if (!skillId) {
        return res.status(400).json({
          error: 'Missing skill ID',
          details: 'skillId is required',
        });
      }

      const adapter = this.getAdapter();
      const skill = await adapter.getSkillDetail(skillId);

      if (!skill) {
        return res.status(404).json({
          error: 'Skill not found',
          details: `No skill found with ID: ${skillId}`,
        });
      }
      const localizedSkill = localizeSkillDefinition(
        skill,
        outputLanguage,
        {
          externalAuthored:
            (await adapter.getSkillOrigin(skillId))?.origin === 'external_pack',
        },
      );

      res.json({
        id: localizedSkill.name,
        name: localizedSkill.name,
        version: localizedSkill.version,
        type: localizedSkill.type,
        meta: localizedSkill.meta,
        triggers: localizedSkill.triggers,
        prerequisites: localizedSkill.prerequisites,
        steps: (localizedSkill.steps || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          description: s.description,
        })),
        inputs: localizedSkill.inputs,
        thresholds: localizedSkill.thresholds,
        output: localizedSkill.output,
      });
    } catch (error) {
      console.error('[SkillController] Error getting skill detail:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to get skill detail',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Execute a specific skill
   * POST /api/skills/execute/:skillId
   * Body: { traceId, packageName? }
   */
  executeSkill = async (req: Request, res: Response) => {
    try {
      const outputLanguage = requestOutputLanguage(req);
      const skillId = toSingleString(req.params.skillId);
      const { traceId, packageName, params } = req.body;

      if (!skillId) {
        return res.status(400).json({
          error: 'Missing skill ID',
          details: 'skillId is required in URL params',
        });
      }

      if (!traceId) {
        return res.status(400).json({
          error: 'Missing trace ID',
          details: 'traceId is required in request body',
        });
      }

      const adapter = this.getAdapter();

      const request: SkillAnalysisRequest = {
        traceId,
        skillId,
        packageName: typeof packageName === 'string' ? packageName : undefined,
        params,  // Pass custom skill parameters
        outputLanguage,
      };

      const result = await adapter.analyze(request);

      res.json(result);
    } catch (error) {
      console.error('[SkillController] Error executing skill:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to execute skill',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Analyze a trace with automatic skill detection
   * POST /api/skills/analyze
   * Body: { traceId, question, packageName? }
   */
  analyzeTrace = async (req: Request, res: Response) => {
    try {
      const outputLanguage = requestOutputLanguage(req);
      const { traceId, question, packageName, skillId } = req.body;

      if (!traceId) {
        return res.status(400).json({
          error: 'Missing trace ID',
          details: 'traceId is required',
        });
      }

      if (!question && !skillId) {
        return res.status(400).json({
          error: 'Missing question or skillId',
          details: 'Either question or skillId is required',
        });
      }

      const adapter = this.getAdapter();

      const request: SkillAnalysisRequest = {
        traceId,
        skillId,
        question,
        packageName,
        outputLanguage,
      };

      const result = await adapter.analyze(request);

      res.json(result);
    } catch (error) {
      console.error('[SkillController] Error analyzing trace:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to analyze trace',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Detect intent from a question
   * POST /api/skills/detect-intent
   * Body: { question }
   */
  detectIntent = async (req: Request, res: Response) => {
    try {
      const outputLanguage = requestOutputLanguage(req);
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: 'Missing question',
          details: 'question is required',
        });
      }

      const adapter = this.getAdapter();
      await adapter.ensureInitialized();

      const skillId = adapter.detectIntent(question);

      if (!skillId) {
        return res.json({
          matched: false,
          skillId: null,
          message: localize(
            outputLanguage,
            '没有找到与该问题匹配的 Skill。',
            'No matching Skill was found for the question.',
          ),
        });
      }

      const skill = await adapter.getSkillDetail(skillId);
      const localizedSkill = skill
        ? localizeSkillDefinition(skill, outputLanguage, {
            externalAuthored:
              (await adapter.getSkillOrigin(skillId))?.origin ===
              'external_pack',
          })
        : undefined;

      res.json({
        matched: true,
        skillId,
        skillName: localizedSkill?.meta.display_name || skillId,
        skillDescription: localizedSkill?.meta.description,
      });
    } catch (error) {
      console.error('[SkillController] Error detecting intent:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to detect intent',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * Detect vendor from trace
   * POST /api/skills/detect-vendor
   * Body: { traceId }
   */
  detectVendor = async (req: Request, res: Response) => {
    try {
      const { traceId } = req.body;

      if (!traceId) {
        return res.status(400).json({
          error: 'Missing trace ID',
          details: 'traceId is required',
        });
      }

      const adapter = this.getAdapter();
      const vendorResult = await adapter.detectVendor(traceId);

      res.json({
        vendor: vendorResult.vendor,
        confidence: vendorResult.confidence,
      });
    } catch (error) {
      console.error('[SkillController] Error detecting vendor:', error);
      const errorResponse: ErrorResponse = {
        error: 'Failed to detect vendor',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  };
}

export default SkillController;
