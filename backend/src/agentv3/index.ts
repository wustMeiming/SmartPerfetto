// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

// Public API surface — only export what external consumers actually import.
// The concrete Claude runtime now lives under agentRuntime/engines/claude.
export {
  createClaudeRuntime,
  isClaudeCodeEnabled,
  type ClaudeAgentConfig,
} from '../agentRuntime/engines/claude';
