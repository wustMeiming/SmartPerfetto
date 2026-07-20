// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractMarkdownLinks,
  extractNpmRunReferences,
  parseCliCommandNames,
  verifyDocumentation,
} from '../verify-docs.mjs';

test('extracts local Markdown links without treating URLs and anchors as files', () => {
  assert.deepEqual(
    extractMarkdownLinks([
      '[local](../README.md#usage)',
      '[web](https://example.com/docs)',
      '[anchor](#section)',
      '![image](../docs/images/example.png)',
    ].join('\n')),
    [
      {target: '../README.md', line: 1},
      {target: '../docs/images/example.png', line: 4},
    ],
  );
});

test('tracks package context for npm run references', () => {
  assert.deepEqual(
    extractNpmRunReferences([
      '```bash',
      'npm run verify:pr',
      'cd backend',
      'npm run build',
      'cd ..',
      'npm --prefix backend run cli:pack-check',
      '```',
    ].join('\n')),
    [
      {prefix: null, cwd: '.', script: 'verify:pr', line: 2},
      {prefix: null, cwd: 'backend', script: 'build', line: 4},
      {prefix: 'backend', cwd: '.', script: 'cli:pack-check', line: 6},
    ],
  );
});

test('derives top-level CLI commands from live help formatting', () => {
  assert.deepEqual(
    parseCliCommandNames([
      'Usage: smp [options] [command]',
      '',
      'Commands:',
      '  run [options] <trace>  run analysis',
      '  knowledge-pack         inspect Pack',
      '  help [command]         display help',
    ].join('\n')),
    ['run', 'knowledge-pack'],
  );
});

test('current repository documentation satisfies derived contracts', () => {
  const result = verifyDocumentation({
    cliHelp: [
      'Usage: smp [options] [command]',
      '',
      'Commands:',
      '  run [options] <trace>  run analysis',
    ].join('\n'),
  });
  assert.deepEqual(result.errors, []);
});
