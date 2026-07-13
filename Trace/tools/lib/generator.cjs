// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)

const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const {collectPacketSequenceIds, encodeTrace} = require('./perfetto-proto.cjs');
const {sha256Buffer} = require('./hash.cjs');

const FIRST_SYNTHETIC_PID = 700000;
const END_STATES = new Map([
  ['R', '0'],
  ['S', '1'],
  ['D', '2'],
]);

function decimalString(value, field) {
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw new Error(`${field} must be an unsigned decimal string`);
  }
  return value;
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function allocatePid(usedPids) {
  let candidate = FIRST_SYNTHETIC_PID;
  while (usedPids.has(candidate)) candidate += 1;
  usedPids.add(candidate);
  return candidate;
}

function validateScenario(scenario) {
  if (!scenario || scenario.schema_version !== 1) {
    throw new Error('scenario.schema_version must be 1');
  }
  decimalString(scenario.clock?.duration_ns, 'scenario.clock.duration_ns');
  if (!Array.isArray(scenario.actors?.processes) || !Array.isArray(scenario.actors?.threads)) {
    throw new Error('scenario.actors.processes and threads must be arrays');
  }
  if (!Array.isArray(scenario.signals)) throw new Error('scenario.signals must be an array');
  for (const [index, signal] of scenario.signals.entries()) {
    nonEmptyString(signal.type, `scenario.signals[${index}].type`);
    decimalString(signal.at_ns, `scenario.signals[${index}].at_ns`);
    if (signal.duration_ns !== undefined) {
      decimalString(signal.duration_ns, `scenario.signals[${index}].duration_ns`);
    }
  }
}

function buildIdentities(scenario, usedPids) {
  const processes = {};
  const threads = {};
  const processDefinitions = new Map();
  const threadDefinitions = new Map();

  for (const actor of scenario.actors.processes) {
    const id = nonEmptyString(actor.id, 'process.id');
    if (processDefinitions.has(id)) throw new Error(`duplicate process actor: ${id}`);
    const pid = allocatePid(usedPids);
    processes[id] = pid;
    processDefinitions.set(id, {...actor, pid});
  }
  for (const actor of scenario.actors.threads) {
    const id = nonEmptyString(actor.id, 'thread.id');
    if (threadDefinitions.has(id)) throw new Error(`duplicate thread actor: ${id}`);
    const process = processDefinitions.get(actor.process);
    if (!process) throw new Error(`thread ${id} references unknown process ${actor.process}`);
    const tid = allocatePid(usedPids);
    threads[id] = tid;
    threadDefinitions.set(id, {...actor, tid, tgid: process.pid});
  }
  return {processes, threads, processDefinitions, threadDefinitions};
}

function absoluteTimestamp(anchor, relative, field) {
  return (BigInt(anchor) + BigInt(decimalString(relative, field))).toString();
}

function actorForSignal(signal, identities) {
  const process = identities.processDefinitions.get(signal.process);
  const thread = identities.threadDefinitions.get(signal.thread);
  if (!thread) throw new Error(`signal references unknown thread ${signal.thread}`);
  const resolvedProcess = process ?? [...identities.processDefinitions.values()].find((item) => item.pid === thread.tgid);
  if (!resolvedProcess) throw new Error(`signal references unknown process ${signal.process}`);
  if (thread.tgid !== resolvedProcess.pid) {
    throw new Error(`thread ${signal.thread} does not belong to process ${signal.process}`);
  }
  return {process: resolvedProcess, thread};
}

function printEvent(timestamp, tid, buf) {
  return {timestamp, pid: tid, print: {buf}};
}

function schedSwitchEvent(timestamp, prev, next, prevState) {
  return {
    timestamp,
    pid: 0,
    schedSwitch: {
      prevComm: prev.name,
      prevPid: prev.tid,
      prevPrio: 120,
      prevState,
      nextComm: next.name,
      nextPid: next.tid,
      nextPrio: 120,
    },
  };
}

function encodeScenarioOverlay(repoRoot, scenario, options) {
  validateScenario(scenario);
  const anchorNs = decimalString(options?.anchorNs, 'options.anchorNs');
  if (!Number.isInteger(options?.sequenceId) || options.sequenceId <= 0) {
    throw new Error('options.sequenceId must be a positive integer');
  }
  const usedPids = new Set(options.usedPids ?? []);
  const identities = buildIdentities(scenario, usedPids);
  const ftraceByCpu = new Map();

  function eventsForCpu(cpu) {
    if (!Number.isInteger(cpu) || cpu < 0) throw new Error(`invalid cpu: ${cpu}`);
    if (!ftraceByCpu.has(cpu)) ftraceByCpu.set(cpu, []);
    return ftraceByCpu.get(cpu);
  }

  for (const [index, signal] of scenario.signals.entries()) {
    const timestamp = absoluteTimestamp(anchorNs, signal.at_ns, `scenario.signals[${index}].at_ns`);
    if (signal.type === 'atrace-slice') {
      const {process, thread} = actorForSignal(signal, identities);
      const end = absoluteTimestamp(timestamp, signal.duration_ns, `scenario.signals[${index}].duration_ns`);
      const events = eventsForCpu(signal.cpu ?? 0);
      events.push(printEvent(timestamp, thread.tid, `B|${process.pid}|${nonEmptyString(signal.name, 'signal.name')}`));
      events.push(printEvent(end, thread.tid, `E|${process.pid}`));
    } else if (signal.type === 'atrace-counter') {
      const {process, thread} = actorForSignal(signal, identities);
      if (typeof signal.value !== 'number' || !Number.isFinite(signal.value)) {
        throw new Error('atrace-counter value must be a finite number');
      }
      eventsForCpu(signal.cpu ?? 0).push(
        printEvent(timestamp, thread.tid, `C|${process.pid}|${nonEmptyString(signal.name, 'signal.name')}|${signal.value}`),
      );
    } else if (signal.type === 'sched-running') {
      const thread = identities.threadDefinitions.get(signal.thread);
      if (!thread) throw new Error(`signal references unknown thread ${signal.thread}`);
      const endState = END_STATES.get(signal.end_state);
      if (endState === undefined) throw new Error(`unsupported sched end_state: ${signal.end_state}`);
      const end = absoluteTimestamp(timestamp, signal.duration_ns, `scenario.signals[${index}].duration_ns`);
      const idle = {tid: 0, name: 'swapper'};
      const task = {tid: thread.tid, name: thread.name};
      const events = eventsForCpu(signal.cpu);
      events.push(schedSwitchEvent(timestamp, idle, task, '0'));
      events.push(schedSwitchEvent(end, task, idle, endState));
    } else {
      throw new Error(`unsupported signal type: ${signal.type}`);
    }
  }

  const processTree = {
    processes: [...identities.processDefinitions.values()].map((actor) => ({
      pid: actor.pid,
      ppid: 1,
      cmdline: [actor.name],
      uid: actor.uid ?? 10999,
    })),
    threads: [...identities.threadDefinitions.values()].map((actor) => ({
      tid: actor.tid,
      tgid: actor.tgid,
      name: actor.name,
    })),
    collectionEndTimestamp: anchorNs,
  };
  const packets = [
    {
      timestamp: anchorNs,
      trustedPacketSequenceId: options.sequenceId,
      incrementalStateCleared: true,
      processTree,
    },
    ...[...ftraceByCpu.entries()]
      .sort(([left], [right]) => left - right)
      .map(([cpu, event]) => ({
        timestamp: anchorNs,
        trustedPacketSequenceId: options.sequenceId,
        ftraceEvents: {cpu, event},
      })),
  ];
  const buffer = encodeTrace(repoRoot, packets);
  return {
    buffer,
    identities: {processes: identities.processes, threads: identities.threads},
    provenance: {
      anchor_ns: anchorNs,
      sequence_id: options.sequenceId,
      overlay_sha256: sha256Buffer(buffer),
    },
  };
}

function materializeTrace(base, overlay, outputPath) {
  if (!Buffer.isBuffer(base) || !Buffer.isBuffer(overlay)) {
    throw new Error('base and overlay must be Buffers');
  }
  const output = Buffer.concat([base, overlay]);
  fs.mkdirSync(path.dirname(outputPath), {recursive: true});
  fs.writeFileSync(outputPath, output);
  return {
    base_bytes: base.length,
    overlay_bytes: overlay.length,
    output_bytes: output.length,
    base_sha256: sha256Buffer(base),
    overlay_sha256: sha256Buffer(overlay),
    output_sha256: sha256Buffer(output),
  };
}

function resolveTraceProcessor(repoRoot) {
  const key = `${process.platform}-${process.arch}`;
  const relative = {
    'darwin-arm64': 'backend/prebuilts/trace_processor/darwin-arm64/trace_processor_shell',
    'linux-x64': 'backend/prebuilts/trace_processor/linux-x64/trace_processor_shell',
    'win32-x64': 'backend/prebuilts/trace_processor/win32-x64/trace_processor_shell.exe',
  }[key];
  if (!relative) throw new Error(`No checked-in trace processor for ${key}`);
  const executable = path.join(repoRoot, relative);
  if (!fs.existsSync(executable)) throw new Error(`Missing trace processor: ${executable}`);
  return executable;
}

function parseProbeCsv(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error(`Trace probe returned no rows: ${output}`);
  const unquote = (value) => value.replace(/^"|"$/g, '').replace(/""/g, '"');
  return lines.slice(1).map((line) => line.split(',').map(unquote));
}

function probeTrace(repoRoot, tracePath) {
  if (!fs.existsSync(tracePath)) throw new Error(`Missing trace: ${tracePath}`);
  const sql = `
    SELECT 'bounds' AS kind, printf('%d', trace_start()) AS value_1,
           printf('%d', trace_end()) AS value_2
    UNION ALL
    SELECT 'pid', CAST(pid AS TEXT), '' FROM process WHERE pid IS NOT NULL
    ORDER BY kind, value_1
  `;
  const result = spawnSync(resolveTraceProcessor(repoRoot), ['-Q', sql, tracePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`trace_processor_shell probe failed (${result.status}): ${result.stderr}`);
  }
  const rows = parseProbeCsv(result.stdout);
  const bounds = rows.find(([kind]) => kind === 'bounds');
  if (!bounds) throw new Error('Trace probe did not return bounds');
  decimalString(bounds[1], 'trace start');
  decimalString(bounds[2], 'trace end');
  return {
    start_ns: bounds[1],
    end_ns: bounds[2],
    used_pids: new Set(
      rows
        .filter(([kind]) => kind === 'pid')
        .map(([, pid]) => Number.parseInt(pid, 10))
        .filter(Number.isInteger),
    ),
  };
}

function chooseAnchor(bounds, clock) {
  const start = BigInt(bounds.start_ns);
  const end = BigInt(bounds.end_ns);
  const duration = BigInt(decimalString(clock.duration_ns, 'scenario.clock.duration_ns'));
  const margin = 1000000n;
  const first = start + margin;
  const last = end - margin - duration;
  if (last < first) {
    throw new Error(`Scenario duration ${duration}ns does not fit trace bounds ${start}-${end}`);
  }
  if (clock.anchor === 'trace-start') return first.toString();
  if (clock.anchor === 'trace-middle') return (first + (last - first) / 2n).toString();
  if (clock.anchor === 'trace-end') return last.toString();
  throw new Error(`Unsupported scenario clock anchor: ${clock.anchor}`);
}

function allocateSequenceId(caseId, usedSequenceIds) {
  const hash = sha256Buffer(Buffer.from(caseId));
  let candidate = (0x70000000 | (Number.parseInt(hash.slice(0, 8), 16) & 0x0fffffff)) >>> 0;
  while (usedSequenceIds.has(candidate) || candidate === 0) candidate = (candidate + 1) >>> 0;
  return candidate;
}

function buildConstructedTrace(repoRoot, options) {
  const base = fs.readFileSync(options.basePath);
  const scenario = JSON.parse(fs.readFileSync(options.scenarioPath, 'utf8'));
  validateScenario(scenario);
  const probe = probeTrace(repoRoot, options.basePath);
  const anchorNs = chooseAnchor(probe, scenario.clock);
  const usedSequenceIds = collectPacketSequenceIds(repoRoot, base);
  const sequenceId = allocateSequenceId(options.caseId, usedSequenceIds);
  const overlay = encodeScenarioOverlay(repoRoot, scenario, {
    anchorNs,
    usedPids: probe.used_pids,
    sequenceId,
  });
  fs.mkdirSync(path.dirname(options.overlayPath), {recursive: true});
  fs.writeFileSync(options.overlayPath, overlay.buffer);
  const materialization = materializeTrace(base, overlay.buffer, options.outputPath);
  const outputProbe = probeTrace(repoRoot, options.outputPath);
  return {
    overlay,
    output_probe: {
      start_ns: outputProbe.start_ns,
      end_ns: outputProbe.end_ns,
      used_pid_count: outputProbe.used_pids.size,
    },
    provenance: {
      case_id: options.caseId,
      anchor_ns: anchorNs,
      sequence_id: sequenceId,
      base_sha256: materialization.base_sha256,
      overlay_sha256: materialization.overlay_sha256,
      output_sha256: materialization.output_sha256,
      base_bytes: materialization.base_bytes,
      overlay_bytes: materialization.overlay_bytes,
      output_bytes: materialization.output_bytes,
    },
  };
}

module.exports = {
  buildConstructedTrace,
  encodeScenarioOverlay,
  materializeTrace,
  probeTrace,
  resolveTraceProcessor,
};
