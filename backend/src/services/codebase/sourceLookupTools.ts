// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

const SOURCE_LOOKUP_TOOLS = new Set([
  'lookup_app_source',
  'lookup_aosp_source',
  'lookup_kernel_source',
  'lookup_oem_sdk',
]);

export function shortSourceLookupToolName(toolName: string): string {
  return toolName.replace(/^mcp__smartperfetto__/, '');
}

export function isSourceLookupToolName(toolName: string): boolean {
  return SOURCE_LOOKUP_TOOLS.has(shortSourceLookupToolName(toolName));
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function containsCodeReference(value: unknown, depth = 0): boolean {
  if (depth > 8 || value == null) return false;
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    return parsed !== undefined && containsCodeReference(parsed, depth + 1);
  }
  if (Array.isArray(value)) return value.some(entry => containsCodeReference(entry, depth + 1));
  if (typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const metadata = record.metadata;
  const filePath = typeof record.filePath === 'string'
    ? record.filePath
    : metadata && typeof metadata === 'object'
      ? (metadata as Record<string, unknown>).filePath
      : undefined;
  if (typeof record.chunkId === 'string' && typeof filePath === 'string') return true;
  return Object.values(record).some(entry => containsCodeReference(entry, depth + 1));
}

export function sourceLookupResultHasCodeReferences(
  toolName: string,
  result: unknown,
): boolean {
  return isSourceLookupToolName(toolName) && containsCodeReference(result);
}
