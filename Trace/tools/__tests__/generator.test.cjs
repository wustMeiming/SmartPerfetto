// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const test = require('node:test');

const {
  buildConstructedTrace,
  encodeScenarioOverlay,
  materializeTrace,
  probeTrace,
} = require('../lib/generator.cjs');
const {resolveCaseTrace} = require('../lib/catalog.cjs');

const repoRoot = path.resolve(__dirname, '../../..');
const traceProcessor = path.join(
  repoRoot,
  'backend/prebuilts/trace_processor/darwin-arm64/trace_processor_shell',
);

function fixtureScenario() {
  return {
    schema_version: 1,
    clock: {anchor: 'trace-start', duration_ns: '500000000'},
    actors: {
      processes: [{id: 'app', name: 'com.smartperfetto.fixture'}],
      threads: [{id: 'main', process: 'app', name: 'main'}],
    },
    signals: [
      {
        type: 'atrace-slice',
        at_ns: '1000000',
        duration_ns: '4000000',
        process: 'app',
        thread: 'main',
        name: 'SmartPerfetto::CPU_CONTENTION',
      },
      {
        type: 'atrace-counter',
        at_ns: '2000000',
        process: 'app',
        thread: 'main',
        name: 'SmartPerfettoPressure',
        value: 73,
      },
      {
        type: 'sched-running',
        at_ns: '1000000',
        duration_ns: '3000000',
        thread: 'main',
        cpu: 0,
        end_state: 'S',
      },
    ],
  };
}

function queryTrace(tracePath, sql) {
  const result = spawnSync(traceProcessor, ['-Q', sql, tracePath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

test('encodes deterministic isolated overlay packets with lossless timestamps', () => {
  const options = {
    anchorNs: '9007199254740993000',
    usedPids: new Set([700000, 700001]),
    sequenceId: 987654,
  };
  const first = encodeScenarioOverlay(repoRoot, fixtureScenario(), options);
  const second = encodeScenarioOverlay(repoRoot, fixtureScenario(), options);

  assert.deepEqual(first.buffer, second.buffer);
  assert.equal(first.identities.processes.app, 700002);
  assert.equal(first.identities.threads.main, 700003);
  assert.equal(first.provenance.anchor_ns, '9007199254740993000');
  assert.equal(first.provenance.sequence_id, 987654);
  assert.ok(first.buffer.length > 0);
});

test('materializes a parseable trace with slice, counter, and sched evidence', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-generator-'));
  const outputPath = path.join(tempDir, 'combined.pftrace');
  const overlay = encodeScenarioOverlay(repoRoot, fixtureScenario(), {
    anchorNs: '1000000000',
    usedPids: new Set(),
    sequenceId: 424242,
  });

  materializeTrace(Buffer.alloc(0), overlay.buffer, outputPath);

  const output = queryTrace(
    outputPath,
    `SELECT
       (SELECT COUNT(*) FROM slice WHERE name = 'SmartPerfetto::CPU_CONTENTION') AS slices,
       (SELECT COUNT(*) FROM counter_track WHERE name = 'SmartPerfettoPressure') AS counters,
       (SELECT COUNT(*) FROM sched s JOIN thread t USING (utid) WHERE t.name = 'main') AS sched_rows`,
  );
  assert.match(output, /1,1,[1-9][0-9]*/);
});

test('rejects unsafe or imprecise scenario values', () => {
  const invalid = fixtureScenario();
  invalid.signals[0].at_ns = 1;

  assert.throws(
    () => encodeScenarioOverlay(repoRoot, invalid, {anchorNs: '1', usedPids: new Set(), sequenceId: 1}),
    /decimal string/,
  );
});

test('materialization is exact protobuf concatenation', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-materialize-'));
  const outputPath = path.join(tempDir, 'trace.pftrace');
  const base = Buffer.from([0x0a, 0x00]);
  const overlay = Buffer.from([0x0a, 0x00, 0x0a, 0x00]);

  const result = materializeTrace(base, overlay, outputPath);

  assert.deepEqual(fs.readFileSync(outputPath), Buffer.concat([base, overlay]));
  assert.equal(result.base_bytes, 2);
  assert.equal(result.overlay_bytes, 4);
  assert.equal(result.output_bytes, 6);
});

test('probes a real base and builds a combined trace inside its bounds', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-real-base-'));
  const basePath = resolveCaseTrace(repoRoot, 'android-startup-light');
  const scenarioPath = path.join(tempDir, 'scenario.json');
  const overlayPath = path.join(tempDir, 'trace.overlay.pftrace');
  const outputPath = path.join(tempDir, 'trace.pftrace');
  fs.writeFileSync(scenarioPath, `${JSON.stringify(fixtureScenario(), null, 2)}\n`);

  const probe = probeTrace(repoRoot, basePath);
  assert.ok(BigInt(probe.end_ns) > BigInt(probe.start_ns));
  assert.ok(probe.used_pids.size > 0);

  const build = buildConstructedTrace(repoRoot, {
    caseId: 'cpu-contention',
    basePath,
    scenarioPath,
    overlayPath,
    outputPath,
  });
  assert.ok(BigInt(build.provenance.anchor_ns) >= BigInt(probe.start_ns));
  assert.ok(BigInt(build.provenance.anchor_ns) + 500000000n <= BigInt(probe.end_ns));
  assert.equal(build.provenance.base_sha256.length, 64);
  assert.equal(build.provenance.output_sha256.length, 64);
  assert.deepEqual(fs.readFileSync(overlayPath), build.overlay.buffer);

  const output = queryTrace(
    outputPath,
    "SELECT COUNT(*) FROM slice WHERE name = 'SmartPerfetto::CPU_CONTENTION'",
  );
  assert.match(output, /\n1\s*$/);
});
