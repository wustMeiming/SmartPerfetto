// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(import.meta.dirname, '../..');
const {
  REQUIRED_RUNTIME_ASSETS,
  frontendHealth,
} = require(path.join(repoRoot, 'frontend/server.js'));

function createFrontendFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'smartperfetto-frontend-health-'));
  const version = 'v1.2-test';
  const versionDir = path.join(root, version);
  fs.mkdirSync(versionDir);
  fs.writeFileSync(
    path.join(root, 'index.html'),
    `<body data-perfetto_version='{"stable":"${version}"}'></body>`,
  );
  const resources = {};
  for (const asset of REQUIRED_RUNTIME_ASSETS) {
    resources[asset] = 'sha256-test';
    fs.writeFileSync(path.join(versionDir, asset), `fixture:${asset}`);
  }
  fs.writeFileSync(path.join(versionDir, 'manifest.json'), JSON.stringify({resources}));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  return {root, version, versionDir};
}

test('prebuilt frontend health requires the versioned manifest and core runtime assets', (t) => {
  const {root, version} = createFrontendFixture(t);
  assert.deepEqual(frontendHealth(root), {status: 'OK', version});
});

test('prebuilt frontend health fails when a declared core runtime asset is missing', (t) => {
  const {root, versionDir} = createFrontendFixture(t);
  fs.rmSync(path.join(versionDir, 'trace_processor.wasm'));
  const health = frontendHealth(root);
  assert.equal(health.status, 'ERROR');
  assert.match(health.error, /trace_processor\.wasm/);
});

test('prebuilt frontend health fails when index version metadata is invalid', (t) => {
  const {root} = createFrontendFixture(t);
  fs.writeFileSync(
    path.join(root, 'index.html'),
    `<body data-perfetto_version='{"stable":"../outside"}'></body>`,
  );
  const health = frontendHealth(root);
  assert.equal(health.status, 'ERROR');
  assert.match(health.error, /invalid stable Perfetto version/);
});
