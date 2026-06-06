#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const verifierPath = path.join(backendRoot, 'src/scripts/verifyAgentSseScrolling.ts');
const tsxCliPath = path.join(backendRoot, 'node_modules/tsx/dist/cli.mjs');

loadBackendEnv();

const suites = {
  startup: {
    label: 'startup final-report gate',
    output: 'test-output/e2e-deepseek-startup-real.json',
    args: [
      '--mode',
      'full',
      '--provider-id',
      'env',
      '--trace',
      '../test-traces/lacunh_heavy.pftrace',
      '--query',
      '分析启动性能',
      '--output',
      'test-output/e2e-deepseek-startup-real.json',
      '--keep-session',
      '--require-conclusion-evidence',
      '--require-claim-verifier-ok',
      '--require-non-partial',
      '--require-final-report-heading',
      '--forbid-process-narration',
      '--forbid-degraded-fallback',
      'completed_plan_summary_fallback',
      '--require-text',
      '冷启动',
      '--require-text',
      'ChaosTask',
      '--forbid-text',
      '完成综合结论输出',
      '--forbid-text',
      '分阶段证据摘要',
      '--forbid-text',
      '完整结构化报告已生成',
      '--forbid-text',
      '应维持温启动',
      '--forbid-text',
      'bindApplication 不存在',
    ],
  },
  scrolling: {
    label: 'scrolling full analysis gate',
    output: 'test-output/e2e-deepseek-scrolling-real.json',
    args: [
      '--mode',
      'full',
      '--provider-id',
      'env',
      '--trace',
      '../test-traces/scroll-demo-customer-scroll.pftrace',
      '--query',
      '分析滑动性能',
      '--output',
      'test-output/e2e-deepseek-scrolling-real.json',
      '--keep-session',
    ],
  },
};

main();

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  assertFile(tsxCliPath, 'tsx CLI');
  assertFile(verifierPath, 'Agent SSE verifier');

  const credential = resolveDeepseekCredential();
  const suiteNames = options.suite === 'all' ? ['startup', 'scrolling'] : [options.suite];

  for (const suiteName of suiteNames) {
    runSuite(suiteName, credential);
  }

  console.log(`\nDeepseek Agent SSE E2E passed: ${suiteNames.join(', ')}`);
}

function parseArgs(argv) {
  let suite = 'all';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      return { suite, help: true };
    }
    if (arg === '--suite') {
      const value = argv[i + 1];
      if (!value) throw new Error('--suite requires a value: all, startup, or scrolling');
      suite = parseSuite(value);
      i += 1;
      continue;
    }
    if (!arg.startsWith('-')) {
      suite = parseSuite(arg);
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  return { suite, help: false };
}

function parseSuite(value) {
  if (value === 'all' || value === 'startup' || value === 'scrolling') return value;
  throw new Error(`Invalid suite: ${value}. Expected all, startup, or scrolling.`);
}

function printUsage() {
  console.log('Usage: node scripts/run-deepseek-agent-e2e.cjs [--suite all|startup|scrolling]');
  console.log('');
  console.log('Runs SmartPerfetto Agent SSE E2E with the Deepseek OpenAI-compatible runtime.');
  console.log('');
  console.log('Credential precedence: DEEPSEEK_API_KEY, then OPENAI_API_KEY.');
  console.log('The child verifier always receives OPENAI_API_KEY plus Deepseek base URL/model pins.');
}

function loadBackendEnv() {
  const envPath = path.join(backendRoot, '.env');
  if (!fs.existsSync(envPath)) return;
  // Load local untracked provider credentials before this wrapper validates them.
  require('dotenv').config({ path: envPath, quiet: true });
}

function resolveDeepseekCredential() {
  const source = process.env.DEEPSEEK_API_KEY ? 'DEEPSEEK_API_KEY' : 'OPENAI_API_KEY';
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'DEEPSEEK_API_KEY or OPENAI_API_KEY is required. Use a local untracked env file or GitHub secret DEEPSEEK_API_KEY; do not commit provider keys.',
    );
  }
  return { apiKey, source };
}

function runSuite(suiteName, credential) {
  const suite = suites[suiteName];
  console.log(`\n[deepseek-e2e] suite=${suiteName} (${suite.label})`);
  console.log(`[deepseek-e2e] output=${suite.output}`);
  console.log(`[deepseek-e2e] credential=${credential.source}`);

  const result = spawnSync(process.execPath, [tsxCliPath, verifierPath, ...suite.args], {
    cwd: backendRoot,
    env: buildChildEnv(credential.apiKey),
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function buildChildEnv(apiKey) {
  return {
    ...process.env,
    SMARTPERFETTO_AGENT_RUNTIME: 'openai-agents-sdk',
    OPENAI_API_KEY: apiKey,
    OPENAI_BASE_URL: 'https://api.deepseek.com/v1',
    OPENAI_AGENTS_PROTOCOL: 'chat_completions',
    OPENAI_MODEL: 'deepseek-v4-pro',
    OPENAI_LIGHT_MODEL: 'deepseek-v4-flash',
    OPENAI_MAX_OUTPUT_TOKENS: '8192',
    DOTENV_CONFIG_QUIET: 'true',
  };
}

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}
