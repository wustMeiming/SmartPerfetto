// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import Database from 'better-sqlite3';
import { describe, expect, it } from '@jest/globals';
import { createAnalysisResultSnapshotRepository } from '../../analysisResultSnapshotStore';
import { applyEnterpriseMinimalSchema } from '../../enterpriseSchema';
import { promoteBatchTraceSnapshots } from '../batchTraceSnapshotPromotionService';
import { BATCH_TRACE_RUN_SCHEMA_VERSION, type BatchTraceRunV1 } from '../batchTraceTypes';

function db(): Database.Database {
  const database = new Database(':memory:');
  applyEnterpriseMinimalSchema(database);
  database.prepare(`
    INSERT INTO organizations (id, name, status, plan, created_at, updated_at)
    VALUES ('tenant-a', 'Tenant A', 'active', NULL, 1, 1)
  `).run();
  database.prepare(`
    INSERT INTO workspaces (id, tenant_id, name, retention_policy, quota_policy, created_at, updated_at)
    VALUES ('workspace-a', 'tenant-a', 'Workspace A', NULL, NULL, 1, 1)
  `).run();
  database.prepare(`
    INSERT INTO trace_assets (id, tenant_id, workspace_id, owner_user_id, local_path, sha256, size_bytes, status, metadata_json, created_at, expires_at)
    VALUES ('trace-a', 'tenant-a', 'workspace-a', NULL, '/tmp/trace-a.pftrace', NULL, 10, 'ready', '{}', 1, NULL)
  `).run();
  return database;
}

function run(): BatchTraceRunV1 {
  return {
    schemaVersion: BATCH_TRACE_RUN_SCHEMA_VERSION,
    id: 'batch-1',
    tenantId: 'tenant-a',
    workspaceId: 'workspace-a',
    createdAt: 1,
    status: 'partial',
    input: {
      skillId: 'startup_analysis',
      params: {},
      traceInputs: [
        { ordinal: 0, source: 'workspace_trace', traceId: 'trace-a' },
        { ordinal: 1, source: 'workspace_trace', traceId: 'trace-missing' },
      ],
      maxConcurrency: 2,
      traceLimit: 100,
    },
    perTrace: [
      {
        ordinal: 0,
        input: { ordinal: 0, source: 'workspace_trace', traceId: 'trace-a', label: 'Trace A' },
        traceId: 'trace-a',
        status: 'completed',
        metrics: [{
          key: 'startup.total_ms',
          label: 'Startup total duration',
          value: 42,
          numericValue: 42,
          unit: 'ms',
          source: { skillId: 'startup_analysis', stepId: 'overview', dataEnvelopeId: 'ev-1' },
          promotableMetricKey: 'startup.total_ms',
        }],
        evidenceEnvelopeIds: ['ev-1'],
        diagnostics: [],
        executionTimeMs: 5,
      },
      {
        ordinal: 1,
        input: { ordinal: 1, source: 'workspace_trace', traceId: 'trace-missing' },
        traceId: 'trace-missing',
        status: 'failed',
        metrics: [],
        evidenceEnvelopeIds: [],
        diagnostics: [{ severity: 'error', message: 'failed' }],
        executionTimeMs: 5,
        error: 'failed',
      },
    ],
  };
}

describe('promoteBatchTraceSnapshots', () => {
  it('promotes only completed results into analysis-result snapshots', () => {
    const database = db();
    const repository = createAnalysisResultSnapshotRepository(database);
    const batchRun = run();

    const promoted = promoteBatchTraceSnapshots({
      scope: { tenantId: 'tenant-a', workspaceId: 'workspace-a' },
      run: batchRun,
      ordinals: [0, 1],
      snapshotRepository: repository,
      db: database,
    });

    expect(promoted).toHaveLength(1);
    const snapshot = repository.getSnapshot({ tenantId: 'tenant-a', workspaceId: 'workspace-a' }, promoted[0].snapshotId);
    expect(snapshot?.title).toBe('Batch Skill result for Trace A');
    expect(snapshot?.metrics[0].key).toBe('startup.total_ms');
    expect(snapshot?.evidenceRefs.map(ref => ref.type)).toEqual(expect.arrayContaining(['data_envelope', 'skill_step']));
    expect(batchRun.perTrace[0].promotedSnapshotId).toBe(promoted[0].snapshotId);
    expect(batchRun.perTrace[1].promotedSnapshotId).toBeUndefined();
    database.close();
  });
});
