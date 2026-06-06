// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {
  asRuntimeDiagnosticsPayload,
  getRuntimeDiagnosticModel,
  getRuntimeDiagnosticProviderMode,
  getRuntimeDiagnostics,
} from '../runtimeDiagnostics';

describe('runtime diagnostics resolver', () => {
  it('resolves public Pi diagnostics through the shared diagnostics path', () => {
    const diagnostics = getRuntimeDiagnostics({
      kind: 'pi-agent-core',
      source: 'env',
    }, {
      env: {
        SMARTPERFETTO_PI_AGENT_CORE_MODEL_JSON: '{"id":"pi-test","provider":"test"}',
      },
    });

    expect(diagnostics).toMatchObject({
      runtime: 'pi-agent-core',
      configured: true,
      experimental: false,
      modelConfigured: true,
    });
  });

  it('resolves hidden experimental diagnostics without exposing them as production descriptors', () => {
    const diagnostics = getRuntimeDiagnostics({
      kind: 'experimental-opencode',
      source: 'env',
    }, {
      env: {
        SMARTPERFETTO_OPENCODE_SDK_MODULE_PATH: '/tmp/opencode-sdk.js',
      },
    });

    expect(diagnostics).toMatchObject({
      runtime: 'experimental-opencode',
      configured: true,
      experimental: true,
      modulePath: '/tmp/opencode-sdk.js',
    });
  });

  it('normalizes model and provider mode to stable strings', () => {
    expect(getRuntimeDiagnosticModel({
      runtime: 'openai-agents-sdk',
      configured: true,
      model: 'glm-5',
    })).toBe('glm-5');
    expect(getRuntimeDiagnosticProviderMode({
      runtime: 'openai-agents-sdk',
      configured: true,
      providerMode: 'openai_chat_completions_compatible',
    })).toBe('openai_chat_completions_compatible');
    expect(getRuntimeDiagnosticModel({
      runtime: 'pi-agent-core',
      configured: true,
      modelConfigured: true,
    })).toBe('pi-agent-core');
    expect(getRuntimeDiagnosticModel({
      runtime: 'pi-agent-core',
      configured: false,
      modelConfigured: false,
    })).toBe('');
    expect(getRuntimeDiagnosticModel({
      runtime: 'opencode',
      configured: false,
      modelConfigured: false,
    })).toBe('opencode');
    expect(getRuntimeDiagnosticProviderMode({
      runtime: 'opencode',
      configured: true,
    })).toBe('opencode');
  });

  it('fails closed for malformed diagnostics without dumping payload contents', () => {
    expect(() => asRuntimeDiagnosticsPayload({
      configured: true,
      apiKey: 'sk-should-not-leak',
    }, 'bad-runtime')).toThrow('Runtime diagnostics for bad-runtime must include a string runtime');
    expect(() => asRuntimeDiagnosticsPayload({
      runtime: 'bad-runtime',
      apiKey: 'sk-should-not-leak',
    }, 'bad-runtime')).toThrow('Runtime diagnostics for bad-runtime must include a boolean configured flag');

    for (const value of [
      { configured: true, apiKey: 'sk-should-not-leak' },
      { runtime: 'bad-runtime', apiKey: 'sk-should-not-leak' },
    ]) {
      try {
        asRuntimeDiagnosticsPayload(value, 'bad-runtime');
      } catch (error) {
        expect(String(error)).not.toContain('sk-should-not-leak');
      }
    }
  });
});
