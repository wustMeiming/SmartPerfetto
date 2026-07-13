#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

const path = require('node:path');

const {
  discoverCoverageTargets,
  resolveCaseTrace,
  validateCatalog,
} = require('./lib/catalog.cjs');
const {writeIndexes} = require('./lib/indexer.cjs');

function parseArgs(argv) {
  const args = [...argv];
  let repoRoot = path.resolve(__dirname, '../..');
  const repoIndex = args.indexOf('--repo');
  if (repoIndex !== -1) {
    const value = args[repoIndex + 1];
    if (!value) throw new Error('--repo requires a path');
    repoRoot = path.resolve(value);
    args.splice(repoIndex, 2);
  }
  return {
    command: args.shift(),
    positional: args.filter((arg) => !arg.startsWith('--')),
    flags: new Set(args.filter((arg) => arg.startsWith('--'))),
    repoRoot,
  };
}

function printIssues(validation) {
  for (const item of validation.issues) {
    const file = item.file ? ` (${item.file})` : '';
    console.error(`[${item.code}] ${item.message}${file}`);
  }
}

function usage() {
  console.log(`Usage: node Trace/tools/trace-corpus.cjs <command> [options]

Commands:
  index [--check]                 Generate or check README/catalog indexes
  validate [--check-generated]   Validate manifests, hashes, and coverage
  coverage                       Print exact Skill and Strategy coverage
  resolve <case-id-or-alias>     Print the committed trace path

Global options:
  --repo <path>                  Override repository root for tooling/tests`);
}

function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.command === 'index') {
    const result = writeIndexes(parsed.repoRoot, {check: parsed.flags.has('--check')});
    console.log(parsed.flags.has('--check')
      ? 'PASS generated indexes are current'
      : `generated ${result.changed.length} file(s)`);
    return 0;
  }
  if (parsed.command === 'validate') {
    if (parsed.flags.has('--check-generated')) writeIndexes(parsed.repoRoot, {check: true});
    const validation = validateCatalog(parsed.repoRoot);
    if (!validation.ok) {
      printIssues(validation);
      return 1;
    }
    console.log(`PASS ${validation.catalog.cases.length} trace case(s) validated`);
    return 0;
  }
  if (parsed.command === 'coverage') {
    const targets = discoverCoverageTargets(parsed.repoRoot);
    const validation = validateCatalog(parsed.repoRoot);
    console.log(`Skills: ${validation.coverage.covered.skills.length}/${targets.skills.length}`);
    console.log(`Strategies: ${validation.coverage.covered.strategies.length}/${targets.strategies.length}`);
    if (!validation.ok) {
      printIssues(validation);
      return 1;
    }
    return 0;
  }
  if (parsed.command === 'resolve') {
    const selector = parsed.positional[0];
    if (!selector) throw new Error('resolve requires a case id or alias');
    console.log(resolveCaseTrace(parsed.repoRoot, selector));
    return 0;
  }
  usage();
  return parsed.command ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

