// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import fs from 'fs';
import path from 'path';
import {
  EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV,
  EXPERIMENTAL_AGENT_RUNTIME_ENV,
  EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
  EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
  isExperimentalAgentRuntimeKind,
  listExperimentalRuntimeKinds,
  resolveExperimentalAgentRuntimeSelection,
} from '../experimentalRuntime';

describe('experimental runtime selection', () => {
  it('keeps hidden runtimes behind shared explicit experiment env vars', () => {
    expect(resolveExperimentalAgentRuntimeSelection({})).toBeUndefined();
    expect(() => resolveExperimentalAgentRuntimeSelection({
      [EXPERIMENTAL_AGENT_RUNTIME_ENV]: EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
    })).toThrow(
      `${EXPERIMENTAL_AGENT_RUNTIME_ENV} requires ${EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV}=1`,
    );
    expect(() => resolveExperimentalAgentRuntimeSelection({
      [EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV]: '1',
      [EXPERIMENTAL_AGENT_RUNTIME_ENV]: 'other-runtime',
    })).toThrow(`Unsupported ${EXPERIMENTAL_AGENT_RUNTIME_ENV}="other-runtime"`);
    expect(resolveExperimentalAgentRuntimeSelection({
      [EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV]: '1',
      [EXPERIMENTAL_AGENT_RUNTIME_ENV]: EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
    })).toEqual({
      kind: EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
      source: 'env',
    });
    expect(resolveExperimentalAgentRuntimeSelection({
      [EXPERIMENTAL_AGENT_RUNTIME_ENABLED_ENV]: 'true',
      [EXPERIMENTAL_AGENT_RUNTIME_ENV]: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
    })).toEqual({
      kind: EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
      source: 'env',
    });
  });

  it('derives experimental runtime predicates from the shared kind list', () => {
    expect(listExperimentalRuntimeKinds()).toEqual([
      EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND,
      EXPERIMENTAL_OPENCODE_RUNTIME_KIND,
    ]);
    expect(isExperimentalAgentRuntimeKind(EXPERIMENTAL_PI_AGENT_CORE_RUNTIME_KIND)).toBe(true);
    expect(isExperimentalAgentRuntimeKind(EXPERIMENTAL_OPENCODE_RUNTIME_KIND)).toBe(true);
    expect(isExperimentalAgentRuntimeKind('pi-agent-core')).toBe(false);
  });
});

describe('experimental runtime import boundaries', () => {
  const srcRoot = path.resolve(__dirname, '..');

  function readSource(relativePath: string): string {
    return fs.readFileSync(path.join(srcRoot, relativePath), 'utf8');
  }

  function staticImports(source: string): string[] {
    return Array.from(source.matchAll(/^\s*import(?:\s+type)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"];?/gm))
      .map(match => match[1]);
  }

  it('keeps selection and experimental kind parsing out of concrete runtime modules', () => {
    expect(staticImports(readSource('runtimeSelection.ts'))).not.toEqual(
      expect.arrayContaining(['./piAgentCoreRuntime', './openCodeRuntime']),
    );
    expect(staticImports(readSource('experimentalRuntime.ts'))).not.toEqual(
      expect.arrayContaining(['./piAgentCoreRuntime', './openCodeRuntime', './runtimeSelection']),
    );
    expect(staticImports(readSource('piAgentCoreRuntime.ts'))).not.toContain('./openCodeRuntime');
  });

  it('keeps experimental runtime factories lazily loaded from the registry', () => {
    const registrySource = readSource('runtimeRegistry.ts');
    expect(staticImports(registrySource)).not.toEqual(
      expect.arrayContaining(['./piAgentCoreRuntime', './openCodeRuntime']),
    );
    expect(registrySource).toContain("require('./piAgentCoreRuntime')");
    expect(registrySource).toContain("require('./openCodeRuntime')");
  });
});
