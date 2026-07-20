# Research Dump 01 — Google Android Skills 当前语料

## Source lock

- Repository: `https://github.com/android/skills`
- Reviewed branch: `main`
- Reviewed commit: `47e1dff74a5cde5d0128c5d15e74e000323135ea`
- Commit date: `2026-07-14T08:21:32Z`
- Latest release at review time: `v1.0.5`
- Release commit: `aaf42b970f9e6ee49e38aabd5cd0d00612e04a5a`
- License: Apache-2.0
- Corpus: 20 `SKILL.md`, 5 Python scripts, 187 Markdown files.
- `main` versus `v1.0.5`: only the new `play/play-policy-insights` subtree
  differs. The two Perfetto Skill subtrees, Android CLI, and testing setup are
  identical.

## Repository intent

The README says the repository publishes AI-optimized, modular instructions
using the Agent Skills standard. Google prioritizes workflows where its
evaluations show LLMs underperform, rather than trying to document all Android
development. This is important for SmartPerfetto: the repository is best
treated as an evaluation-derived gap signal and methodology source, not as an
authoritative runtime or complete performance corpus.

The repository itself warns that AI output must be checked. The Perfetto
subtree contains no owned trace fixtures or semantic regression suite. Its
Perfetto SQL reference is a generated 6,669-line stdlib Markdown snapshot with
no visible Perfetto version or commit identifier in the file.

## Complete 20-Skill classification

Legend:

- `D`: direct trace-analysis relevance.
- `M`: transferable method, not direct domain content.
- `N`: no meaningful SmartPerfetto/Perfetto-Skills sync target.
- `SP`: SmartPerfetto product/process only.
- `PS`: portable public Perfetto-Skills candidate.

| Official Skill | Class | Reusable value | Recommended destination |
|---|---|---|---|
| `perfetto-sql` | D | stdlib-first schema lookup, idempotency, open interval handling, identifier discipline, bounded validation loop | SP + PS, but corrected against current Perfetto |
| `perfetto-trace-analysis` | D | facts-first evidence chain, broad-to-narrow, wall-time/CPU-time split, dependency traversal, second-pass search | SP + PS, expressed as bounded workflow gates |
| `android-cli` | M | layout-first UI inspection, exact journey steps, per-step structured failure evidence | SP capture/reproduction/QA integration only |
| `r8-analyzer` | M | quantitative path first, explicit heuristic downgrade, no mutation during audit | SP eval/report methodology |
| `play-policy-insights` | M | deterministic first phase, isolated artifacts, schema validation, retry only invalid work, critic pass | SP orchestration/eval methodology |
| `testing-setup` | M | inventory before adding frameworks, fakes before mocks, test-pyramid and device-state matrix | SP trace corpus/eval planning |
| `camerax` | M | API discovery, lifecycle blueprint, hardware-diversity and fake boundaries | SP camera capture/evidence workflow; no generic public copy |
| `migrate-xml-views-to-jetpack-compose` | M | baseline capture, plan, behavior and visual validation before deleting old path | SP UI migration/QA method |
| `adaptive` | M | verify current UI first, multi-size screenshot matrix, experimental API confirmation | SP UI QA method |
| `wear-compose-m3` | M | use version-matched source samples, resolve version skew before changing code | SP upstream/source-pin practice |
| `android-intent-security` | M | decision tables, explicit safe/unsafe cases, structured audit report | SP rule-engine/eval design method |
| `agp-9-upgrade` | M | prerequisites, ordered migration, verification and troubleshooting | Generic migration discipline only |
| `play-billing-library-version-upgrade` | M | discovery, version-specific document mapping, sequential verification | Generic migration discipline only |
| `appfunctions` | N | AppFunctions product integration | No trace-analysis sync |
| `verified-email` | N | identity/credential implementation | No trace-analysis sync |
| `styles` | N | Compose Styles API migration | No trace-analysis sync |
| `navigation-3` | N | Navigation 3 implementation recipes | No trace-analysis sync |
| `engage-sdk-integration` | N | Play Engage integration | No trace-analysis sync |
| `edge-to-edge` | N | Compose edge-to-edge implementation | No trace-analysis sync |
| `display-glasses-with-jetpack-compose-glimmer` | N | Android XR UI implementation | No trace-analysis sync |

## Method patterns worth retaining

### 1. Inventory before action

Several Skills start by discovering the current project, tool, version, and
existing tests before recommending changes. SmartPerfetto already follows this
at repository level; the useful extension is to make the same rule explicit for
trace capability, schema and capture provenance.

### 2. Quantitative path with named fallback

`r8-analyzer` separates a supported quantitative path from an older-version
heuristic path. It does not pretend the two have equal confidence. This maps
well to SmartPerfetto's five-state evidence availability contract and should
remain an explicit downgrade, not a hidden fallback.

### 3. Deterministic artifacts between phases

`play-policy-insights` treats the orchestrator output as the source of truth,
stores each delegated result in an isolated artifact, validates those artifacts
before aggregation, retries only missing or invalid work, and runs a critic
pass. This is more useful to SmartPerfetto than its Play policy content.

### 4. Baseline before transformation

Compose migration and adaptive UI Skills capture the baseline before editing
and keep behavioral checks separate from screenshot parity. For SmartPerfetto
this applies to frontend changes and, more importantly, to trace-query
semantics: preserve a fixture-backed baseline before replacing SQL.

### 5. Version-matched primary source

The Wear Skill requires examples matching the actual dependency version and
refuses to guess around unresolved symbols. This reinforces SmartPerfetto's
existing Perfetto tag, binary, RPC, stdlib, fixture and source locks.

## What not to copy

- Product-specific Android implementation instructions.
- The monolithic prompt style as a replacement for YAML Skills.
- Any “always” or “must” claim that lacks a current Perfetto schema/source
  check and an owned fixture.
- The local scratchpad beside the trace as a public runtime contract.
- The bundled stdlib Markdown as an unversioned source of truth.
