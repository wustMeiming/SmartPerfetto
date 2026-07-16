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
