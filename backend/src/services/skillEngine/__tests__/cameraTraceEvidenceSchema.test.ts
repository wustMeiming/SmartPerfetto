// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import fs from 'fs';
import path from 'path';
import {describe, expect, it} from '@jest/globals';
import yaml from 'js-yaml';

const skillPath = path.join(
  process.cwd(),
  'skills',
  'composite',
  'camera_trace_evidence.skill.yaml',
);
const skill = yaml.load(fs.readFileSync(skillPath, 'utf-8')) as any;

const EXPECTED_STEP_IDS = [
  'evidence_coverage',
  'camera_process_candidates',
  'camera_slice_candidates',
  'camera_binder_summary',
  'camera_dmabuf_summary',
  'pixel_camera_stage_summary',
] as const;

function getStep(id: string): any {
  const step = skill.steps?.find((candidate: any) => candidate.id === id);
  expect(step).toBeDefined();
  return step;
}

function expectTypedColumns(stepId: string, expected: Record<string, string>): void {
  const columns = getStep(stepId).display?.columns;
  expect(Array.isArray(columns)).toBe(true);

  for (const [name, type] of Object.entries(expected)) {
    expect(columns).toEqual(expect.arrayContaining([
      expect.objectContaining({name, type}),
    ]));
  }
}

describe('camera_trace_evidence skill schema', () => {
  it('declares the evidence-first Camera composite contract', () => {
    expect(skill).toMatchObject({
      name: 'camera_trace_evidence',
      type: 'composite',
      category: 'rendering',
      tier: 'B',
    });
    expect(skill.prerequisites.required_tables).toEqual(
      expect.arrayContaining(['slice', 'thread', 'process']),
    );
    expect(skill.prerequisites.modules).toEqual(expect.arrayContaining([
      'slices.with_context',
      'android.binder',
      'android.frames.timeline',
      'android.memory.dmabuf',
      'linux.cpu.frequency',
      'pixel.camera',
    ]));
    expect(skill.steps.map((step: any) => step.id)).toEqual(EXPECTED_STEP_IDS);
  });

  it('keeps all inputs optional and window controls bounded in production SQL', () => {
    expect(skill.inputs).toEqual([
      expect.objectContaining({name: 'start_ts', type: 'timestamp', required: false}),
      expect.objectContaining({name: 'end_ts', type: 'timestamp', required: false}),
      expect.objectContaining({name: 'max_rows', type: 'integer', required: false}),
    ]);

    for (const step of skill.steps) {
      expect(step.sql).toContain('trace_start()');
      expect(step.sql).toContain('trace_end()');
      expect(step.sql).toMatch(/MIN\(MAX\(COALESCE\(\$\{max_rows\|20\}/);
    }
  });

  it('publishes stable coverage and typed evidence detail columns', () => {
    expectTypedColumns('evidence_coverage', {
      evidence_family: 'string',
      status: 'string',
      row_count: 'number',
      source: 'string',
      limitation: 'string',
    });
    expectTypedColumns('camera_process_candidates', {
      identity_kind: 'string',
      process_name: 'string',
      thread_name: 'string',
      upid: 'number',
      pid: 'number',
      utid: 'number',
      tid: 'number',
      source: 'string',
      limitation: 'string',
    });
    expectTypedColumns('camera_slice_candidates', {
      ts: 'timestamp',
      dur_ns: 'duration',
      slice_name: 'string',
      process_name: 'string',
      thread_name: 'string',
      upid: 'number',
      utid: 'number',
      source: 'string',
      limitation: 'string',
    });
    expectTypedColumns('camera_binder_summary', {
      ts: 'timestamp',
      dur_ns: 'duration',
      client_process: 'string',
      client_thread: 'string',
      server_process: 'string',
      server_thread: 'string',
      client_upid: 'number',
      client_utid: 'number',
      server_upid: 'number',
      server_utid: 'number',
      source: 'string',
      limitation: 'string',
    });
    expectTypedColumns('camera_dmabuf_summary', {
      process_name: 'string',
      upid: 'number',
      pid: 'number',
      allocation_count: 'number',
      allocation_bytes: 'bytes',
      release_bytes: 'bytes',
      observed_net_delta_bytes: 'bytes',
      peak_event_bytes: 'bytes',
      source: 'string',
      limitation: 'string',
    });
    expectTypedColumns('pixel_camera_stage_summary', {
      cam_id: 'number',
      node: 'string',
      port_group: 'string',
      frame_count: 'number',
      avg_duration_ns: 'duration',
      max_duration_ns: 'duration',
      source: 'string',
      limitation: 'string',
    });
  });

  it('keeps each step self-describing for evidence and report consumers', () => {
    for (const step of skill.steps) {
      expect(step.display).toEqual(expect.objectContaining({
        layer: expect.stringMatching(/^(overview|list)$/),
        level: expect.stringMatching(/^(summary|detail)$/),
        columns: expect.any(Array),
      }));
      expect(step.display.columns.length).toBeGreaterThan(0);
      expect(step.display.columns.every((column: any) => (
        typeof column.name === 'string' && typeof column.type === 'string'
      ))).toBe(true);
      expect(step.save_as).toBe(step.id);
      expect(step.synthesize).toEqual(expect.objectContaining({
        role: expect.stringMatching(/^(overview|list)$/),
        fields: expect.any(Array),
      }));
      expect(step.synthesize.fields.length).toBeGreaterThan(0);
    }
  });

  it('avoids unsupported timing and leak conclusions', () => {
    const productionText = JSON.stringify(skill).toLowerCase();
    expect(productionText).not.toMatch(/time[_ -]?to[_ -]?(open|first[_ -]?frame)/);
    expect(productionText).not.toMatch(/retained[_ -]?at[_ -]?trace[_ -]?end/);
    expect(skill.steps.every((step: any) => step.type !== 'diagnostic')).toBe(true);
  });
});
