# Code Quality Review: i18n Post-Diff Review

Review target: SmartPerfetto worktree `/Users/chris/Code/.worktrees/SmartPerfetto-i18n-review-fix`

Scope reviewed:
- Base: `origin/main` at `4ec0aceaebbe6aea18014a0a92db32b5f76c9f43`
- Head: `4eeb18485ef70e34a2566d9b123f3becf70915bc`
- Main implementation commit: `0525154b feat: localize SmartPerfetto analysis surfaces`
- Perfetto submodule range: `d1248365..d0c93372`

Reviewer mode: read-only source/test/diff review. No source fixes were made.

## Skill-Perspective Check

`remove-ai-slops` and `programming` skills were required by the review brief. They were not available in the exposed skill list, and a filesystem lookup under the configured skill roots did not find matching `SKILL.md` files, so I applied the criteria documented in the prompt/context.

Result:
- `remove-ai-slops` perspective: violation found. `verify:i18n` and the catalog tests give false confidence because they verify names, steps, columns, tooltips, and synthesized labels, but not built-in Skill descriptions, while the audit report claims descriptions are covered.
- `programming` perspective: violation found. The production localization boundary is incomplete for an explicitly in-scope user-facing field (`meta.description` / list `description`), and the validation boundary mirrors only the generated catalog shape rather than the claimed product contract.

## CRITICAL

None.

## HIGH

### Built-in Skill descriptions remain Chinese in English Skill surfaces

English Skill list/detail/detect-intent responses still expose the original Chinese descriptions for most built-in Skills. This violates the stated success criterion that the 234 built-in Skills have a zh-CN/en projection for names, descriptions, steps, columns, and metrics.

Evidence:
- `backend/scripts/generateSkillLocalizationCatalog.ts:37` defines `CatalogSkill` with `displayName`, `type`, and `steps`, but no `description`.
- `backend/src/services/skillLocalization.ts:243` localizes Skill list items but only replaces `displayName`, leaving `description` unchanged.
- `backend/src/services/skillLocalization.ts:282` localizes Skill definitions but only replaces `meta.display_name`, leaving `meta.description` unchanged.
- `backend/src/services/skillEngine/skillAnalysisAdapter.ts:1011` builds list rows with `description: skill.meta?.description || ''`; because `localizeSkillListItem` does not replace that field, English list output leaks Chinese authored descriptions.
- `backend/src/controllers/skillController.ts:107` returns localized Skill detail `meta` as-is, so `meta.description` remains Chinese.
- `backend/src/controllers/skillController.ts:273` returns `skillDescription: localizedSkill?.meta.description`, so detect-intent can also leak Chinese descriptions.
- `scripts/verify-i18n.mjs:89` validates catalog `displayName`, step titles, columns, tooltips, and synthesized labels, but never validates Skill descriptions.
- `docs/reviews/2026-07-20-multilingual-audit.md:70` claims "names, descriptions, step titles, columns, and aggregate metrics" were fixed by the strict catalog.

Runtime probe:

```bash
cd backend
npx tsx -e "import {createSkillAnalysisAdapter} from './src/services/skillEngine/skillAnalysisAdapter'; import {getTraceProcessorService} from './src/services/traceProcessorService'; async function main(){ const a=createSkillAnalysisAdapter(getTraceProcessorService()); const rows=await a.listSkills('en'); const leaks=rows.filter(x=>/\\p{Script=Han}/u.test(x.description||'')); console.log(JSON.stringify({total:rows.length,hanDescription:leaks.length,sample:leaks.slice(0,8).map(x=>({id:x.id,displayName:x.displayName,description:x.description}))}, null, 2)); } main();"
```

Observed result: `total: 234`, `hanDescription: 224`. Sample leaked descriptions include:
- `android_bitmap_memory_per_process`: "每进程 Bitmap counter、heap graph metadata 和跨进程来源归因"
- `android_dvfs_counter_stats`: "CPU/GPU/DDR 频率统计（min/max/avg）"
- `android_gpu_work_period_track`: "GPU 实际工作区间（功耗模型前置数据）"
- `android_heap_graph_leak_candidates`: "基于 Java heap graph、生命周期切片和引用关系识别 Activity/Fragment 泄漏候选"

Required fix before approval:
- Add built-in Skill description localization to the generated catalog and runtime projection.
- Update `verify:i18n` and focused tests so this field cannot regress.
- Keep external authored Skill pack behavior explicit instead of inventing translations for third-party content.

## MEDIUM

### Skill REST controller still returns hard-coded English validation and failure errors

`backend/src/controllers/skillController.ts` parses `outputLanguage` on success paths, but many validation and failure responses remain hard-coded English. Chinese requests can still receive English API errors on the Skill endpoints.

Examples:
- `backend/src/controllers/skillController.ts:66` - `Failed to list skills`
- `backend/src/controllers/skillController.ts:84` - `Missing skill ID`
- `backend/src/controllers/skillController.ts:94` - `Skill not found`
- `backend/src/controllers/skillController.ts:128` - `Failed to get skill detail`
- `backend/src/controllers/skillController.ts:148` - `Missing skill ID`
- `backend/src/controllers/skillController.ts:155` - `Missing trace ID`
- `backend/src/controllers/skillController.ts:195` - `Missing trace ID`
- `backend/src/controllers/skillController.ts:202` - `Missing question or skillId`
- `backend/src/controllers/skillController.ts:223` - `Failed to analyze trace`
- `backend/src/controllers/skillController.ts:242` - `Missing question`
- `backend/src/controllers/skillController.ts:282` - `Failed to detect intent`
- `backend/src/controllers/skillController.ts:300` - `Missing trace ID`
- `backend/src/controllers/skillController.ts:315` - `Failed to detect vendor`

This is not the main blocker because most core success paths are localized, but it is still part of the user-facing i18n contract and should be corrected before calling the audit complete.

### Audit documentation overstates verification evidence

The multilingual audit report states that exact command outcomes were recorded in the commit handoff, but commit `0525154b` has only a one-line commit message and no verification body. Before this report was written, `.omo/evidence` also did not contain a matching i18n evidence artifact for the claimed handoff.

This makes the audit trail harder to trust and compounds the false-confidence issue above, especially because `verify:i18n` passed while descriptions were outside its coverage.

## LOW

None.

## Verification Performed

Passed:
- `npm run verify:i18n`
- `npm --prefix backend test -- --runInBand src/agentv3/__tests__/outputLanguage.test.ts src/services/__tests__/skillLocalization.test.ts src/services/__tests__/criticalPathLocalization.test.ts src/services/__tests__/criticalPathAiSummary.localization.test.ts src/services/__tests__/teachingLocalization.test.ts src/services/skillEngine/__tests__/skillAnalysisAdapter.test.ts src/routes/__tests__/agentTeachingRoutes.test.ts`
- `npm --prefix backend run typecheck`
- `npm run check:frontend-prebuild`
- `git diff --check origin/main...HEAD`
- `git diff --check`
- `git -C perfetto diff --check d1248365..d0c93372`

Additional review probes:
- `git diff --name-status origin/main...HEAD`
- `git -C perfetto diff --stat d1248365..d0c93372`
- Runtime Skill list probe showing 224/234 English Skill descriptions still contain Han script.
- Static catalog probe showing the generated catalog has no description field to validate.

## Overall

`codeQualityStatus`: BLOCK

`recommendation`: REQUEST_CHANGES

Blockers:
- Built-in Skill descriptions must be localized for English Skill list/detail/detect-intent surfaces, and `verify:i18n` must cover that field before this can be approved.
