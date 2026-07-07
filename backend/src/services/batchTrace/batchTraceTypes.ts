// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import type {
  ComparisonMetricKey,
  MultiTraceComparisonRun,
  NormalizedMetricValue,
} from '../../types/multiTraceComparison';

export const BATCH_TRACE_RUN_SCHEMA_VERSION = 'batch_trace_run@1' as const;

export type BatchTraceInputSource = 'local_path' | 'workspace_trace';
export type BatchTraceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';
export type BatchTraceResultStatus = 'completed' | 'failed' | 'unsupported';
export type BatchTraceSurface = 'cli' | 'api';

export interface BatchTraceInputV1 {
  ordinal: number;
  source: BatchTraceInputSource;
  tracePath?: string;
  traceId?: string;
  label?: string;
  sizeBytes?: number;
}

export interface BatchTraceMetricV1 {
  key: string;
  label: string;
  value: number | string | null;
  numericValue?: number;
  unit?: string;
  source: {
    skillId: string;
    stepId?: string;
    dataEnvelopeId?: string;
    displayResultStepId?: string;
  };
  promotableMetricKey?: ComparisonMetricKey;
  missingReason?: string;
}

export interface BatchTraceDiagnosticV1 {
  severity: string;
  message: string;
}

export interface BatchTraceResultV1 {
  ordinal: number;
  input: BatchTraceInputV1;
  traceId?: string;
  status: BatchTraceResultStatus;
  metrics: BatchTraceMetricV1[];
  evidenceEnvelopeIds: string[];
  diagnostics: BatchTraceDiagnosticV1[];
  executionTimeMs: number;
  error?: string;
  promotedSnapshotId?: string;
}

export interface BatchTraceAggregateMetricV1 {
  key: string;
  label: string;
  unit?: string;
  count: number;
  missingCount: number;
  min?: number;
  p50?: number;
  p90?: number;
  p95?: number;
  max?: number;
  mean?: number;
  outlierOrdinals: number[];
}

export interface BatchTraceRunV1 {
  schemaVersion: typeof BATCH_TRACE_RUN_SCHEMA_VERSION;
  id: string;
  tenantId?: string;
  workspaceId?: string;
  createdBy?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: BatchTraceRunStatus;
  input: {
    skillId: string;
    params: Record<string, unknown>;
    traceInputs: BatchTraceInputV1[];
    maxConcurrency: number;
    traceLimit: number;
  };
  perTrace: BatchTraceResultV1[];
  aggregate?: {
    metrics: BatchTraceAggregateMetricV1[];
    limitations: string[];
  };
  report?: {
    htmlPath?: string;
    jsonPath?: string;
    reportId?: string;
  };
  comparisonId?: string;
}

export interface RunBatchSkillInput {
  id?: string;
  scope?: {
    tenantId: string;
    workspaceId: string;
    userId?: string;
  };
  surface: BatchTraceSurface;
  skillId: string;
  params?: Record<string, unknown>;
  traceInputs: BatchTraceInputV1[];
  maxConcurrency?: number;
  traceLimit?: number;
  onTraceResult?: (result: BatchTraceResultV1) => void;
}

export interface PromotedBatchSnapshot {
  ordinal: number;
  snapshotId: string;
  metrics: NormalizedMetricValue[];
}

export interface BatchTraceComparisonBridgeResult {
  run: BatchTraceRunV1;
  promotedSnapshots: PromotedBatchSnapshot[];
  comparison: MultiTraceComparisonRun;
}
