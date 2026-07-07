// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as path from 'path';
import type { BatchTraceRunV1 } from './batchTraceTypes';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value: number | undefined): string {
  if (value === undefined) return '';
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/\.?0+$/, '');
}

function perTraceRows(run: BatchTraceRunV1): string {
  return run.perTrace.map(result => {
    const diagnostics = result.diagnostics.map(item => `${item.severity}: ${item.message}`).join('; ');
    return `<tr>
      <td>${result.ordinal}</td>
      <td>${escapeHtml(result.input.label ?? result.input.traceId ?? result.input.tracePath)}</td>
      <td>${escapeHtml(result.status)}</td>
      <td>${result.metrics.length}</td>
      <td>${formatNumber(result.executionTimeMs)} ms</td>
      <td>${escapeHtml(result.error ?? diagnostics)}</td>
    </tr>`;
  }).join('\n');
}

function aggregateRows(run: BatchTraceRunV1): string {
  return (run.aggregate?.metrics ?? []).map(metric => `<tr>
    <td>${escapeHtml(metric.label)}</td>
    <td>${metric.count}</td>
    <td>${metric.missingCount}</td>
    <td>${formatNumber(metric.min)}</td>
    <td>${formatNumber(metric.p50)}</td>
    <td>${formatNumber(metric.p90)}</td>
    <td>${formatNumber(metric.p95)}</td>
    <td>${formatNumber(metric.max)}</td>
    <td>${formatNumber(metric.mean)}</td>
    <td>${escapeHtml(metric.outlierOrdinals.join(', '))}</td>
  </tr>`).join('\n');
}

function limitationItems(run: BatchTraceRunV1): string {
  const limitations = run.aggregate?.limitations ?? [];
  if (limitations.length === 0) return '<li>None</li>';
  return limitations.map(item => `<li>${escapeHtml(item)}</li>`).join('\n');
}

export function renderBatchTraceHtmlReport(run: BatchTraceRunV1): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SmartPerfetto Batch Trace Run ${escapeHtml(run.id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; color: #1f2328; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0 28px; }
    th, td { border: 1px solid #d0d7de; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f6f8fa; }
    code { background: #f6f8fa; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>SmartPerfetto Batch Trace Run</h1>
  <p><strong>Run:</strong> <code>${escapeHtml(run.id)}</code></p>
  <p><strong>Skill:</strong> <code>${escapeHtml(run.input.skillId)}</code></p>
  <p><strong>Status:</strong> ${escapeHtml(run.status)}</p>
  <p><strong>Trace count:</strong> ${run.input.traceInputs.length}</p>
  <h2>Per Trace Results</h2>
  <table>
    <thead>
      <tr><th>Ordinal</th><th>Trace</th><th>Status</th><th>Metrics</th><th>Execution</th><th>Diagnostics / Error</th></tr>
    </thead>
    <tbody>${perTraceRows(run)}</tbody>
  </table>
  <h2>Aggregate Metrics</h2>
  <table>
    <thead>
      <tr><th>Metric</th><th>Count</th><th>Missing</th><th>Min</th><th>P50</th><th>P90</th><th>P95</th><th>Max</th><th>Mean</th><th>Outliers</th></tr>
    </thead>
    <tbody>${aggregateRows(run)}</tbody>
  </table>
  <h2>Limitations</h2>
  <ul>${limitationItems(run)}</ul>
</body>
</html>`;
}

export function writeBatchTraceArtifacts(input: {
  run: BatchTraceRunV1;
  directory: string;
  htmlPath?: string;
  jsonPath?: string;
}): BatchTraceRunV1 {
  fs.mkdirSync(input.directory, { recursive: true });
  const jsonPath = input.jsonPath ?? path.join(input.directory, 'result.json');
  const htmlPath = input.htmlPath ?? path.join(input.directory, 'report.html');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  const withPaths: BatchTraceRunV1 = {
    ...input.run,
    report: {
      ...(input.run.report ?? {}),
      jsonPath,
      htmlPath,
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(withPaths, null, 2));
  fs.writeFileSync(htmlPath, renderBatchTraceHtmlReport(withPaths));
  return withPaths;
}
