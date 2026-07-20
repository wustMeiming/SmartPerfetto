# SmartPerfetto Documentation Center

[English](README.en.md) | [中文](README.md)

SmartPerfetto is an Android performance analysis platform built on Perfetto. This documentation center is organized for open-source users, contributors, and maintainers: first get the project running, then learn the architecture, then extend it.

## Recommended Reading Paths

| Reader | Start here | Continue with |
|---|---|---|
| First-time user | [Quick Start](getting-started/quick-start.en.md) | [Configuration Guide](getting-started/configuration.en.md), [Feature Overview](getting-started/features.en.md), [Basic Usage](getting-started/usage.en.md), [Portable Packaging](reference/portable-packaging.en.md) |
| User evaluating SmartPerfetto features | [Feature Overview](getting-started/features.en.md) | [Basic Usage](getting-started/usage.en.md), [Configuration Guide](getting-started/configuration.en.md) |
| Multi-trace result comparison user | [Multi-Trace Analysis Result Comparison](getting-started/multi-trace-result-comparison.en.md) | [Basic Usage](getting-started/usage.en.md), [API Reference](reference/api.en.md) |
| User who wants AI to reference local source code | [Code-Aware Analysis](getting-started/code-aware-analysis.en.md) | [CLI Reference](reference/cli.en.md), [MCP Tools Reference](reference/mcp-tools.en.md) |
| User of the built-in Android Internals Pack or a private knowledge base | [Android Internals Knowledge Pack And Private Knowledge](getting-started/android-internals-knowledge.en.md) | [CLI Reference](reference/cli.en.md), [API Reference](reference/api.en.md), [MCP Tools Reference](reference/mcp-tools.en.md) |
| Backend API integrator | [API Reference](reference/api.en.md) | [MCP Tools Reference](reference/mcp-tools.en.md) |
| CLI or automation user | [CLI Reference](reference/cli.en.md) | [API Reference](reference/api.en.md) |
| Contributor | [Root AGENTS.md](../AGENTS.md) | [Product Surface Rules](../.claude/rules/product-surface.md), [Testing Rules](../.claude/rules/testing.md), [Contributing Guide](../CONTRIBUTING.md) |
| Skill author | [Skill System Guide](reference/skill-system.en.md) | [MCP Tools Reference](reference/mcp-tools.en.md), [Testing Rules](../.claude/rules/testing.md) |
| Architecture reader | [Architecture Overview](architecture/overview.en.md) | [Agent Runtime](architecture/agent-runtime.en.md), [Technical Architecture](architecture/technical-architecture.en.md), [Data Contract](../backend/docs/DATA_CONTRACT_DESIGN.en.md) |
| Release maintainer | [Release Runbook](reference/release.en.md) | [Portable Packaging](reference/portable-packaging.en.md), [Release Rules](../.claude/rules/release.md) |
| Deployment troubleshooter | [Troubleshooting](operations/troubleshooting.en.md) | [Configuration Guide](getting-started/configuration.en.md) |
| Historical plan or review reader | [Archive](archive/README.md) | Archived docs are background only, not the current recommended implementation |

## Documentation Structure

```text
docs/
├── README.md                         # Chinese documentation entry
├── README.en.md                      # English documentation entry
├── getting-started/                  # Installation, configuration, usage
├── architecture/                     # Current architecture and authoritative design
├── reference/                        # API, CLI, MCP, and Skill DSL references
├── operations/                       # Runtime operations and troubleshooting
├── rendering_pipelines/              # Runtime-read Android rendering pipeline knowledge
├── product/                          # External project positioning
├── presentations/                    # External sharing material
├── blog/                             # Draft blog posts; finalized posts move to AndroidPerformance.com
├── archive/                          # Historical proposals, spikes, reviews, and development plans
└── images/                           # Documentation images
```

## Authoritative Docs

- Startup and runtime flow: [Quick Start](getting-started/quick-start.en.md), [CLI Reference](reference/cli.en.md), [Portable Packaging](reference/portable-packaging.en.md), and [Release Runbook](reference/release.en.md).
- Current documentation claims are checked by `npm run verify:docs` for local links, npm scripts, live CLI coverage, and forbidden release-command drift.
- The bilingual feature surfaces, every built-in Skill, and README completeness are covered by the [2026-07-20 multilingual audit](reviews/2026-07-20-multilingual-audit.en.md).
- The current per-surface evidence log is [the 2026-07-20 documentation and feature compatibility audit](reviews/2026-07-20-documentation-feature-compatibility-audit.md) (Chinese).
- Feature and bug work: use [Product Surface Rules](../.claude/rules/product-surface.md) to check Web UI, CLI, API, reports, Docker, portable packages, runtime/provider, Node version, and bundled-content impact.
- Release, npm, portable, and Docker work: [Release Runbook](reference/release.en.md) and [Release Rules](../.claude/rules/release.md).
- Provider and model configuration: [Configuration Guide](getting-started/configuration.en.md).
- Backend API: [API Reference](reference/api.en.md).
- CLI usage: [CLI Reference](reference/cli.en.md).
- MCP tools: [MCP Tools Reference](reference/mcp-tools.en.md) and the tool registry, not old static tool counts.
- Skill DSL and layered outputs: [Skill System Guide](reference/skill-system.en.md).
- DataEnvelope and frontend/backend contracts: [Data Contract](../backend/docs/DATA_CONTRACT_DESIGN.en.md).
- Final report, evidence/claim verification, identity resolution, and chat-vs-report boundaries: [Architecture Overview](architecture/overview.en.md) and [Agent Runtime](architecture/agent-runtime.en.md).
- Cross-surface implementation map: [Technical Architecture](architecture/technical-architecture.en.md).
- Rendering pipeline summary: [Android 17 Rendering Type Overview](rendering_pipelines/S01_rendering_types_overview.md).
- [Self-Improving Design](architecture/self-improving-design.md) records the
  subsystem design background; source, configuration, and tests define its
  current runtime boundary.
- Files under [Archive](archive/README.md) are historical. Dated plans, reviews,
  RFC implementation records, and presentation material elsewhere are evidence
  snapshots rather than current operational instructions.

## Runtime-Read Documentation

`docs/rendering_pipelines/` is not only normal documentation. Teaching mode, pipeline detection, and some Skill results refer to these Markdown files through `doc_path: rendering_pipelines/*.md`. Moving or renaming those files requires synchronized updates to:

- `backend/skills/pipelines/*.skill.yaml`
- `backend/skills/atomic/rendering_pipeline_detection.skill.yaml`
- `backend/skills/pipelines/index.yaml`

The files in this directory are authoritative Android 17 content synchronized from a pinned
upstream commit and must not be edited manually. Update them with
`npm run sync:rendering-pipelines -- --source <checkout> --apply`. Builds copy
the directory to `backend/dist/rendering_pipelines/` for every release form.

After such a change, run at least:

```bash
npm run check:rendering-pipelines
cd backend && npm run validate:skills
```
