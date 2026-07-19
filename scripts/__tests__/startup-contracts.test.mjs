// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

test('source launchers share ownership-aware lifecycle semantics', () => {
  const lifecycle = read('scripts/service-lifecycle.sh');
  assert.doesNotMatch(lifecycle, /^[^#\n]*\bwait -n\b/m);
  assert.match(lifecycle, /start_identity/);
  assert.match(lifecycle, /generation/);
  assert.match(lifecycle, /Refusing to stop an unowned listener/);

  for (const scriptPath of [
    'start.sh',
    'scripts/start-dev.sh',
    'scripts/restart-backend.sh',
    'scripts/stop-dev.sh',
  ]) {
    const script = read(scriptPath);
    assert.match(script, /service-lifecycle\.sh/);
    assert.doesNotMatch(script, /kill_processes_on_port/);
    assert.doesNotMatch(script, /pkill -f/);
  }

  const restartBackend = read('scripts/restart-backend.sh');
  assert.match(restartBackend, /launch-detached\.mjs/);
});

test('dev launcher uses canonical dependencies and a complete UI/WASM build', () => {
  const script = read('scripts/start-dev.sh');
  assert.match(script, /tools\/install-build-deps --ui/);
  assert.match(script, /PERFETTO_NODE" ui\/build\.mjs 2>&1/);
  assert.doesNotMatch(script, /ui\/build\.mjs[^\n]*--only-wasm-memory64/);
  assert.doesNotMatch(script, /ui\/build\.mjs[^\n]*--no-depscheck/);
  assert.doesNotMatch(script, /ui\/build\.mjs[^\n]*--no-wasm/);
  assert.doesNotMatch(script, /git checkout origin\/main/);
  assert.doesNotMatch(script, /^\s*npm run generate:frontend-types/m);
});

test('Docker image and both compose paths require backend and frontend health', () => {
  for (const file of ['Dockerfile', 'docker-compose.yml', 'docker-compose.hub.yml']) {
    const contents = read(file);
    assert.match(contents, /SMARTPERFETTO_BACKEND_PORT/);
    assert.match(contents, /\/health/);
    assert.match(contents, /SMARTPERFETTO_FRONTEND_PORT/);
  }

  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /tini/);
  assert.match(dockerfile, /ENTRYPOINT \["\/usr\/bin\/tini", "--", "\/app\/docker-entrypoint\.sh"\]/);

  const entrypoint = read('scripts/docker-entrypoint.sh');
  assert.match(entrypoint, /wait_for_service[\s\S]*Backend/);
  assert.match(entrypoint, /wait_for_service[\s\S]*Frontend/);
  assert.match(entrypoint, /FRONTEND_PORT}\/health/);
  assert.doesNotMatch(entrypoint, /health\.aiEngine|const ai = health\.aiEngine/);
});

test('backend predev delegates trace processor handling to the guarded installer', () => {
  const packageJson = JSON.parse(read('backend/package.json'));
  assert.equal(packageJson.scripts.predev, 'npm run trace-processor:ensure');
  assert.equal(packageJson.scripts['trace-processor:ensure'], 'node scripts/ensure-trace-processor.cjs');
});
