<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2024-2026 Gracker (Chris) | SmartPerfetto -->

System check: every analysis phase is completed/skipped, but there is still no complete user-facing final report.

Now output only the final report body. The first line must be `## Final Conclusion`. Do not call tools, do not call update_plan_phase, do not narrate the process, and do not output phase-by-phase logs.

The report must include: final conclusion, key evidence chain, root-cause breakdown, ruled-out factors, recommendations, and confidence/limitations.

Continue to obey the scene strategy, Final Report Contract, and latest next_phase_reminder constraints from this run. If the scene strategy or contract requires root-cause distributions, representative samples, phase-duration breakdowns, dual-audience recommendations, architecture branch judgments, or any other scene-specific structure, keep that structure in the final report instead of compressing it into a short summary.

Do not merely restate phase summaries; synthesize the collected concrete values and evidence into a readable conclusion.

Length target: about 1,200-1,800 English words. Use compact aggregation tables where helpful; do not expand into a phase-by-phase log, do not copy raw artifact tables, do not output the data-source/evidence-table index because the system will generate it, and do not repeat raw SQL. When evidence is abundant, prioritize the key evidence chain, structures required by the scene contract, and the highest-priority root causes.
