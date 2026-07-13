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
const {buildCatalogCases} = require('../lib/builder.cjs');

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

test('materializes memory, battery, power, GPU, CPU frequency, IRQ, and async evidence', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trace-generator-signals-'));
  const outputPath = path.join(tempDir, 'combined.pftrace');
  const scenario = fixtureScenario();
  scenario.signals.push(
    {
      type: 'process-stats',
      at_ns: '10000000',
      process: 'app',
      vm_rss_kb: 102400,
      rss_anon_kb: 81920,
      rss_file_kb: 20480,
      vm_swap_kb: 1024,
      vm_hwm_kb: 122880,
      oom_score_adj: 200,
    },
    {
      type: 'process-stats',
      at_ns: '20000000',
      process: 'app',
      vm_rss_kb: 133120,
      rss_anon_kb: 102400,
      rss_file_kb: 30720,
      vm_swap_kb: 2048,
      vm_hwm_kb: 143360,
      oom_score_adj: 900,
    },
    {
      type: 'battery-counters',
      at_ns: '30000000',
      capacity_percent: 80,
      charge_counter_uah: '4000000',
      current_ua: '-500000',
      voltage_uv: '4000000',
    },
    {
      type: 'battery-counters',
      at_ns: '40000000',
      capacity_percent: 79,
      charge_counter_uah: '3999000',
      current_ua: '-550000',
      voltage_uv: '3980000',
    },
    {
      type: 'power-rail',
      at_ns: '50000000',
      duration_ns: '10000000',
      name: 'SYNTHETIC_CPU',
      subsystem: 'CPU',
      start_energy_uws: '1000000',
      end_energy_uws: '1100000',
    },
    {
      type: 'gpu-work-period',
      at_ns: '70000000',
      duration_ns: '10000000',
      gpu_id: 0,
      uid: 10999,
      active_duration_ns: '8000000',
      cpu: 0,
    },
    {type: 'gpu-frequency', at_ns: '90000000', gpu_id: 0, value: 700000, cpu: 0},
    {type: 'cpu-frequency', at_ns: '100000000', cpu_id: 0, value: 1800000, cpu: 0},
    {
      type: 'irq-span',
      at_ns: '110000000',
      duration_ns: '2000000',
      irq: 42,
      name: 'synthetic_irq',
      cpu: 0,
    },
    {
      type: 'frame-timeline',
      at_ns: '115000000',
      duration_ns: '20000000',
      process: 'app',
      cookie: 100,
      token: 200,
      display_frame_token: 300,
      layer_name: 'SyntheticLayer',
      jank_type: 64,
    },
    {type: 'gpu-power-state', at_ns: '116000000', old_state: 0, new_state: 2, cpu: 0},
    {type: 'cpu-idle', at_ns: '117000000', cpu_id: 0, state: 1, cpu: 0},
    {
      type: 'atrace-async-slice',
      at_ns: '120000000',
      duration_ns: '5000000',
      process: 'app',
      thread: 'main',
      name: 'SyntheticAsync',
      cookie: 7,
    },
    {
      type: 'atrace-async-track-slice',
      at_ns: '130000000',
      duration_ns: '5000000',
      process: 'app',
      thread: 'main',
      track_name: 'SyntheticTrack',
      name: 'SyntheticTrackEvent',
      cookie: 8,
    },
    {
      type: 'lmk-kill',
      at_ns: '140000000',
      duration_ns: '1000000',
      process: 'app',
      thread: 'main',
      kill_reason: 3,
      oom_score_adj: 900,
    },
  );
  const overlay = encodeScenarioOverlay(repoRoot, scenario, {
    anchorNs: '1000000000',
    usedPids: new Set(),
    sequenceId: 434343,
  });
  materializeTrace(Buffer.alloc(0), overlay.buffer, outputPath);

  const output = queryTrace(outputPath, `
    INCLUDE PERFETTO MODULE android.battery;
    INCLUDE PERFETTO MODULE android.gpu.work_period;
    INCLUDE PERFETTO MODULE android.oom_adjuster;
    INCLUDE PERFETTO MODULE linux.memory.process;
    INCLUDE PERFETTO MODULE linux.irqs;
    INCLUDE PERFETTO MODULE android.gpu.mali_power_state;
    INCLUDE PERFETTO MODULE linux.cpu.idle;
    INCLUDE PERFETTO MODULE android.memory.lmk;
    SELECT
      (SELECT COUNT(*) FROM memory_rss_and_swap_per_process) AS rss,
      (SELECT COUNT(*) FROM android_battery_charge) AS battery,
      (SELECT COUNT(*) FROM track WHERE type = 'power_rails') AS rails,
      (SELECT COUNT(*) FROM android_gpu_work_period_track t JOIN slice s ON s.track_id = t.id) AS gpu_work,
      (SELECT COUNT(*) FROM gpu_counter_track WHERE name GLOB '*freq*') AS gpu_freq,
      (SELECT COUNT(*) FROM cpu_counter_track WHERE name = 'cpufreq') AS cpu_freq,
      (SELECT COUNT(*) FROM linux_hard_irqs WHERE name GLOB '*synthetic_irq*') AS irq,
      (SELECT COUNT(*) FROM actual_frame_timeline_slice WHERE layer_name = 'SyntheticLayer') AS frame,
      (SELECT COUNT(*) FROM android_mali_gpu_power_state) AS gpu_power,
      (SELECT COUNT(*) FROM cpu_idle_counters WHERE idle = 1) AS cpu_idle,
      (SELECT COUNT(*) FROM slice WHERE name = 'SyntheticAsync') AS async_slice,
      (SELECT COUNT(*) FROM slice s JOIN process_track pt ON pt.id = s.track_id WHERE s.name = 'SyntheticAsync') AS async_process_slice,
      (SELECT COUNT(*) FROM slice s JOIN process_track pt ON pt.id = s.track_id WHERE pt.name = 'SyntheticTrack' AND s.name = 'SyntheticTrackEvent') AS named_async,
      (SELECT COUNT(*) FROM android_lmk_events WHERE process_name = 'com.smartperfetto.fixture') AS lmk,
      (SELECT COUNT(*) FROM android_oom_adj_intervals) AS oom_adj`);
  assert.match(output, /\n(?:[1-9][0-9]*,){14}[1-9][0-9]*\s*$/);
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
    `SELECT
       (SELECT COUNT(*) FROM slice WHERE name = 'SmartPerfetto::CPU_CONTENTION') AS markers,
       COALESCE((SELECT value FROM stats WHERE name = 'mismatched_sched_switch_tids'), 0) AS sched_mismatches`,
  );
  assert.match(output, /\n1,0\s*$/);
  assert.ok(Object.values(build.provenance.cpu_map).every((cpu) => Number(cpu) > 0));
});

test('rebuilds a repository constructed case with matching source hash and provenance', () => {
  const result = buildCatalogCases(repoRoot, {caseIds: ['startup-lifecycle'], check: true});

  assert.equal(result.length, 1);
  assert.equal(result[0].case_id, 'startup-lifecycle');
  assert.equal(result[0].overlay_hash_matches, true);
  assert.ok(fs.existsSync(path.join(repoRoot, result[0].output)));
  assert.ok(fs.existsSync(path.join(repoRoot, result[0].provenance_file)));
  const provenance = JSON.parse(fs.readFileSync(path.join(repoRoot, result[0].provenance_file), 'utf8'));
  assert.equal(provenance.trace_processor.sha256.length, 64);
  assert.match(provenance.trace_processor.version, /^Perfetto /);
});
