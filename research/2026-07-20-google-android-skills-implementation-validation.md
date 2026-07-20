# Google Android Skills implementation validation

## Paired repository evidence

- SmartPerfetto implementation base: `492de55c566e7643d482e5c3c8037b89d4baaeb7`
- Perfetto-Skills portable guardrail commit: `dea0d1f0bca38678ccaf2325fa68b8103fcc9032`
- Perfetto-Skills original upstream-governance commit:
  `52bb5d10bc33206d24a5290d2224ec04b8f01ac1`
- Perfetto-Skills superseding metadata-only correction:
  `455c5a91db46794c06c87badc6e5d6e883f4e177`
- Perfetto-Skills trace-backed verification commit:
  `c6b782562f44dfe30e45cf18ef1731071615ac45`
- SmartPerfetto impact decision: `required`
- SmartPerfetto change fingerprint:
  `4a2f5a70e9dce8ddb2215e788abaac5ce08ff456db120c57c2f13ecc21fef628`
- Perfetto-Skills impact decision: `required`
- Perfetto-Skills change fingerprint:
  `1fc52677f3900e50a35c0cf6d4ee91a734614edcafcbc3ec24c0a58f13082c97`

Both impact checkers validated an immutable paired checkout HEAD. Neither
installed product gains a runtime dependency on the sibling checkout.

The original governance commit persisted a standalone Android Skills metadata
inventory. That representation was removed by the superseding correction.
Current synchronization reads the pinned and candidate Git trees from a
disposable checkout and persists only the repository/commit/subtree-tree lock,
reviewed decisions, and minimal gap report. No Android Skills source body or
standalone source inventory is retained.

## Verification

### SmartPerfetto

- Complete repository gate: `npm run verify:pr` passed on the final rerun,
  including 909/909 core tests and 6/6 real scene traces. The first run had one
  transient `socket hang up` in `agentRoutesRbac.test.ts`; its 25 tests passed
  in isolation before the complete gate was rerun successfully.
- Guardrail and structured strategy contract: 2 suites, 27 tests passed.
- Trace-backed SPAN_JOIN regression: 1 suite, 2 tests passed on
  `Trace/real/android-startup-light/trace.pftrace`; both inputs had zero
  per-`utid` overlap violations before execution, and the guarded join returned
  `233648518` ns of overlap.
- TypeScript typecheck: passed.
- Strategy validation: 21 strategy files, 0 missing Skills, 0 contract errors.
- Real scene trace regression: 6/6 traces passed.
- Independent final diff review: PASS after the missing-partition regression,
  structured closure contract, and public analyzer split were verified.

### Perfetto-Skills

- Complete gate: `uv run python tools/verify.py`.
- Result after the metadata-only correction and trace regression: 187 tests
  completed with 1 expected skip; 651/651 static queries valid;
  11 semantic assertions executed; official Skill validator passed; upstream
  locks and generated tree were current.
- Android Skills inventory dry-run: 11 classifications, 0 drift, 0 unresolved.
- Lock validation and staged diff checks: passed.
- Dedicated real-trace regression passed on the independently owned
  `startup-light-api36` fixture and reproduced the same zero-violation witnesses
  and `233648518` ns overlap as SmartPerfetto.

## Scope decisions

Adopted now:

- explicit `SPAN_JOIN` partition and same-input/same-partition non-overlap
  review;
- deterministic portable SQL guardrails;
- an open-ended-analysis closing sweep bounded to three secondary domains;
- immutable `android/skills` repository/commit/subtree-tree provenance with
  reviewed path/hash classifications and canary automation, without retaining
  the upstream corpus.

Kept as future candidates rather than copied now:

- IRQ-specific deep dives;
- real-time scheduling and priority-inversion extensions;
- generic catch-up burst heuristics.

Those candidates require trace-backed fixtures and distinct evidence contracts.
The Android application-development Skills remain methodology references, not
portable Perfetto domain content.
