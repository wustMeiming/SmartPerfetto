# SmartPerfetto Multilingual Audit

Date: 2026-07-20

[中文](2026-07-20-multilingual-audit.md) | [English](2026-07-20-multilingual-audit.en.md)

## Outcome

SmartPerfetto now has one explicit `auto | zh-CN | en` language contract across
the Web UI, backend API, built-in Skills, teaching, critical-path analysis,
MCP, and CLI projections. Every built-in Skill is represented by the generated
[localization catalog](../../backend/skills/localization.catalog.json), while
stable Skill IDs, step IDs, SQL, enum values, evidence references, timestamps,
and report provenance remain untranslated.

The audit and independent follow-up review found 18 issue classes. All are
fixed in this change. The repository now fails `npm run verify:i18n` when the
built-in Skill catalog is stale, an
English catalog entry contains Han characters, a required feature surface loses
its locale-aware projection, the README pairs drift structurally, or a known
single-language UI regression returns.

## Scope

The review followed the user-visible product path rather than only searching
for translated strings:

| Surface | Reviewed behavior |
|---|---|
| Language preference | Browser auto-detection, explicit Chinese/English choice, persistence, request projection, and session retirement |
| AI Assistant | Welcome, presets, commands, selection cards, streaming progress, conclusions, evidence, reports, reconnect, cancellation, errors, and export |
| Skill runtime | List, definition, invocation, comparison, layered results, summaries, diagnostics, empty states, columns, and synthesized metrics |
| Skill consumers | Web UI, REST, agent adapter, MCP, maintainer CLI, and user CLI |
| Teaching | Pipeline detection, lanes, dependencies, completeness, pins, overlay plan, and copyable Markdown evidence |
| Critical path | Validation errors, deterministic summary, AI prompt, modules, anomalies, evidence, recommendations, and warnings |
| Scene and trace tools | Story, reconstruction, overlays, area/slice selection, bookmarks, dual-trace workspace, trace catalog, and navigation |
| Configuration | Provider Manager, runtime/model details, backend connection, Code-Aware sources, and private knowledge sources |
| Data presentation | SQL tables, charts, Markdown formatting, Mermaid errors, trace-location labels, and data-envelope presentation |
| Documentation | Root README pair, documentation-center pair, language precedence, UI behavior, and this audit |

## Inventory

### Functional Inventory

The audited implementation covers the feature surfaces above through the
locale-aware Web UI helpers, canonical backend `OutputLanguage`, and
presentation-only projectors. The raw analysis objects remain the source for AI
reasoning and provenance; localization is applied only to user-facing
projections.

### Skill Inventory

The live registry generated 234 built-in Skills:

| Runtime type | Count |
|---|---:|
| Atomic | 120 |
| Composite | 80 |
| Deep | 2 |
| Comparison | 1 |
| Pipeline definition | 31 |
| **Total** | **234** |

Eighteen entries are module experts and overlap the runtime types above. The
catalog also covers 1,223 display steps and 3,468 explicitly declared columns.
`npm run verify:i18n` traverses every Skill, step, column, tooltip, and
synthesized label. The catalog is the complete per-Skill review ledger: each
stable Skill ID has non-empty `zh-CN` and `en` names, descriptions, and display
metadata; the few explicit step descriptions are covered by the same gate.

External Skill packs are intentionally reported as `external_authored`.
SmartPerfetto does not invent translations for third-party content, and it does
not silently treat an external Skill as a missing built-in localization.

## Findings

| ID | Finding | Affected surfaces | Resolution |
|---|---|---|---|
| I18N-01 | The Web UI implicitly followed `navigator.language` and had no explicit preference. | Settings, all UI text | Added persistent `auto`, `zh-CN`, and `en` selection. |
| I18N-02 | Changing language could continue an existing backend session and mix languages. | Sessions, streamed analysis | A language change retires the current backend agent session before the next analysis. |
| I18N-03 | Built-in Skill names, step titles, columns, and synthesized metrics had no complete bilingual source. | All 234 built-in Skills | Added a registry-generated, strict localization catalog and freshness check. |
| I18N-04 | Authored Skill narrative in the other language could leak into a selected locale. | Summaries, execution messages, diagnostics, empty states | Added locale-matched neutral fallbacks and retained raw narrative in explicit provenance fields. |
| I18N-05 | Missing built-in localization could fall back silently, while external packs were not distinguished. | Skill list/invoke/compare | Built-ins now fail closed; external packs carry `external_authored` status. |
| I18N-06 | REST, agent adapter, MCP, and CLI Skill projections did not consistently resolve the requested output language. | API, MCP, CLI | Propagated canonical output language through list, definition, invocation, comparison, and diagnostics. |
| I18N-07 | Streaming status, plan, verification, evidence, report, subagent, and error sections contained single-language UI copy. | SSE chat projection | Localized every frontend-owned SSE presentation section without translating evidence IDs. |
| I18N-08 | Teaching projected several titles, relationships, warnings, and completeness messages in one language. | Teaching API and Web UI | Added a teaching presentation projector and bilingual UI/Markdown labels. |
| I18N-09 | Critical-path validation, deterministic summary, prompt, anomalies, and recommendations were not one coherent language contract. | Critical-path API and extension | Added locale-specific validation, prompt/summary generation, and a non-mutating presentation projector. |
| I18N-10 | Provider, runtime/model details, connection fields, and settings status mixed English and Chinese. | Provider Manager and Settings | Added bilingual labels, placeholders, hints, status, and detail rows. |
| I18N-11 | Code-Aware and private-knowledge registration contained single-language fields and states. | Codebase and knowledge panels | Localized forms, indexing/consent states, preview counts, and errors. |
| I18N-12 | Slice/area cards, bookmarks, trace locations, workspace catalog, dual-trace controls, and overlays leaked one language. | Trace interaction surfaces | Localized frontend-owned presentation while retaining trace/entity identifiers. |
| I18N-13 | Story/scene progress, reconstruction, pin instructions, and overlay labels were not fully locale-aware. | Scene reconstruction | Localized the state machine and copied instructions without mutating stable scene mappings. |
| I18N-14 | Slash commands, ANR/Jank helpers, reconnect, export, query review, SQL tables, charts, Markdown, and Mermaid errors had hard-coded copy. | Chat utilities and data presentation | Replaced direct strings with the shared language projection. |
| I18N-15 | README documented only the backend environment variable and did not explain the Web preference or precedence. | `README.md`, `README.zh-CN.md` | Documented UI selection, persistence, session retirement, canonical values, and env fallback. |
| I18N-16 | There was no repository gate to detect Skill localization or paired-document drift. | CI and maintainer workflow | Added `npm run verify:i18n` and included it in `verify:pr`. |
| I18N-17 | The first catalog omitted Skill `description`; an English list probe still found Han text in 224 of 234 built-in Skills. | Skill list, detail, and intent detection | The independent review added Skill/step descriptions to the catalog, runtime projection, full-registry tests, and the gate. |
| I18N-18 | Skill REST validation and failure responses remained hard-coded in English. | Skill list, detail, execution, analysis, intent, and vendor detection | Error headings and parameter guidance now follow the request language while technical error details remain verbatim. |

## Fixes

### Language Contract

- The saved UI preference is `auto`, `zh-CN`, or `en`.
- `auto` resolves the browser language; explicit choices do not depend on the
  browser.
- Requests carry the canonical backend value `zh-CN` or `en`.
- The backend can still use `SMARTPERFETTO_OUTPUT_LANGUAGE` for CLI, server
  defaults, and clients that do not send an explicit language.
- A Web preference is explicit request context and therefore takes precedence
  over the backend default.
- Switching the Web preference retires the current agent session to prevent
  mixed-language turns.

### Skill Projection

- The generator reads the live built-in registry rather than a hard-coded Skill
  list or count.
- Display names, descriptions, step titles/descriptions, explicit column labels/tooltips,
  and synthesized metric labels have both locales.
- Inferred schema labels use a locale-aware identifier humanizer.
- A built-in Skill missing from the catalog is a runtime and verification
  error.
- A mismatched authored narrative is replaced only on the visible projection;
  `sourceContent`, `sourceNarrative`, or `sourceEmptyMessage` retains the exact
  source.

### Feature Projection

The UI uses the same selected locale for settings, provider management,
Code-Aware sources, chat, SSE sections, selection/navigation tools, teaching,
critical path, scene reconstruction, SQL/data rendering, sessions, and export
feedback. Backend projectors are mutation-free where raw objects also feed AI
reasoning or evidence provenance.

### Documentation

Both root READMEs and both documentation-center READMEs link this audit. The
English and Chinese root README heading structures are checked together, as are
the two documentation-center entries and this report pair.

## Invariants

- Never translate Skill IDs, step IDs, SQL identifiers, enum wire values,
  evidence reference IDs, timestamps, trace IDs, report IDs, or code symbols.
- Never mutate raw critical-path or Skill evidence to produce UI text.
- Never hide the authored source when a locale fallback replaces visible
  narrative.
- Never require an external Skill pack to masquerade as a translated built-in
  Skill.
- Never resume the same backend analysis session after an explicit language
  switch.
- Never hand-edit the generated localization catalog; update the registry
  source or generator and regenerate it.

## Verification

The change is covered by:

- Backend type checking and targeted Jest suites for Skill localization,
  teaching localization, critical-path localization and output-language
  resolution.
- Frontend type checking plus targeted Vitest suites for language selection,
  data formatting, SSE projection, scene/story presentation, providers, SQL
  tables, workspace catalog, sessions, and navigation.
- `npm run verify:i18n`, `npm run verify:docs`, the Skill validation gate,
  frontend prebuild synchronization, and the repository `verify:pr` gate.
- Independent read-only code review after implementation.

Perfetto-Skills impact review: `not_required`. This change only affects
SmartPerfetto presentation and request-language routing; it does not change
portable Skill YAML, SQL, evidence semantics, export policy, or the public
runtime contract. Change fingerprint:
`d41858fdf581769dae84321e1fe0e85ede06b319a0d8ed08678ae5dc0ef8ca70`.

Exact command outcomes are summarized in the final delivery. This durable
report records the reproducible gates and does not claim the commit message
contains a verification log.

## Residual Boundaries

SmartPerfetto supports Simplified Chinese and English, not arbitrary locale
packs. Third-party Skill packs retain their authored language until their
authors provide translations. Model-authored prose may still contain technical
names or quoted evidence from the trace; this is intentional when translation
would corrupt provenance. Historical Perfetto UI lint debt outside this plugin
is not a multilingual defect and is tracked separately from the passing
typecheck and targeted test gates.
