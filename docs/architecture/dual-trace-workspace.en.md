# Dual Trace Workspace Operation Model

[English](dual-trace-workspace.en.md) | [中文](dual-trace-workspace.md)

This document defines the Web UI operation model for Raw Trace Compare. It
extends the comparison-mode section in [Architecture Overview](overview.en.md)
and focuses on user operations, AI Panel context, frontend/backend coordination,
and edge cases. Analysis Result Compare still uses the workspace comparison API
and is out of scope here.

## Product Principles

- The default remains single-window. Opening a normal trace shows one Perfetto
  timeline and the AI Panel.
- Selecting a reference trace enters comparison context, but does not
  automatically open the dual workspace.
- The dual workspace is explicit. The user clicks "Open dual window" in the
  comparison bar to open two complete Perfetto timelines on the same page.
- "Collapse workspace" and "Exit comparison" are different. Collapse hides the
  visual workspace while keeping the reference trace and comparison context;
  exit clears the reference trace, comparison context, and comparison agent
  session.
- AI context is independent of visual panes. Even when the workspace is
  collapsed, `current` and `reference` remain available to SQL, Skills, reports,
  and multi-turn comparison. Visual state only tells the model which pane is
  live UI and which pane is context-only.
- Dual workspace iframes do not own new AI sessions and do not re-upload traces.
  They are complete Perfetto timeline views only.

## State Machine

| State | UI | Backend comparison capability | Entered by | Leaves by |
| --- | --- | --- | --- | --- |
| Single trace | One timeline + AI Panel | Single-trace tools | Normal trace open, exit comparison, workspace switch, new trace reset | Select reference trace |
| Comparison context | One timeline + comparison bar | `referenceTraceId` and comparison tools available | Trace picker selection | Exit comparison, trace/workspace switch |
| Dual workspace | Two complete timelines on the same page | Same as comparison context, plus visual layout state | Click "Open dual window" | Collapse workspace or exit comparison |
| Pane minimized | One live iframe + one minimized rail | Both traces remain analyzable; minimized pane is `context_only` | Pane minimize button | Restore rail, reset, maximize another pane, exit |
| Pane maximized | One iframe fills the workspace | Maximized pane is `live`; other pane is `context_only` | Pane maximize button | Restore, reset, exit |

## Loading Flow

### 1. Normal Trace Load

1. The user opens a trace in Perfetto UI.
2. The frontend uploads/registers it through `/api/traces/upload` or an existing
   HTTP RPC target.
3. Once `backendTraceId` is ready, the AI Panel becomes analyzable.
4. `referenceTraceId = null` and `tracePairWorkspaceOpen = false`.

If the current backend trace is not ready, the comparison entry should not open
a partial workspace.

### 2. Select Reference Trace

1. The user clicks the compare button in the AI Panel header.
2. The trace picker lists traces from the current workspace.
3. The picker filters out the current `backendTraceId`.
4. The user selects one reference trace.
5. The frontend sets:
   - `referenceTraceId`
   - `referenceTraceName`
   - `isReferenceActive = false`
   - `tracePairWorkspaceOpen = false`
   - `tracePairSplitPercent = 50`
   - `tracePairMaximizedTraceSide = null`
   - `tracePairMinimizedTraceSides = empty`
6. The comparison bar appears, but the page stays in a single timeline view.

Backend raw trace comparison is already enabled at this point. The user may ask
comparison questions immediately or open the dual workspace first.

### 3. Explicit Dual Workspace Open

1. The user clicks "Open dual window" in the comparison bar.
2. The frontend confirms both current `backendTraceId` and `referenceTraceId`
   exist.
3. `tracePairWorkspaceOpen = true`.
4. The page renders `ai-trace-pair-workspace`.
5. Current and reference panes each create a same-origin iframe with:
   - `hideSidebar=true`
   - `mode=embedded`
   - `smartperfettoDualTrace=true`
   - `smartperfettoPane=current|reference`
   - `url=/api/workspaces/:workspaceId/traces/:traceId/file`
6. `load_trace.ts` sees `smartperfettoDualTrace=true` and skips AI backend
   upload.
7. Each iframe uses Perfetto UI's own WASM engine to load a complete timeline.

The main AI Panel remains the only conversation entry.

## Workspace Operations

| Operation | Entry | State change | AI context effect |
| --- | --- | --- | --- |
| Horizontal/vertical layout | Workspace toolbar | `tracePairLayout = horizontal|vertical`, clears maximized | `primarySide/referenceSide` map to left/right or top/bottom |
| Drag splitter | Middle separator | Updates `tracePairSplitPercent`, clamped to 18-82 | `splitPercent` enters `tracePairContext` |
| Maximize pane | Pane toolbar | `tracePairMaximizedTraceSide = current|reference`, clears minimized | Maximized pane is `live`; the other is `context_only` |
| Minimize pane | Pane toolbar | `tracePairMinimizedTraceSides = {side}`, clears maximized | Minimized pane is `context_only`; the other is `live` |
| Restore minimized pane | Minimized rail | Removes side from minimized set | Pane becomes `live` |
| Open pane in new tab | Pane toolbar | No current-state change | Auxiliary viewing only |
| Collapse workspace | Workspace header | `tracePairWorkspaceOpen = false`, clears max/min | Comparison context remains; workspaceOpen becomes false |
| Exit comparison | Comparison bar | Clears reference, agent session, and workspace state | Future requests become single-trace |

Collapse preserves `tracePairLayout` and `tracePairSplitPercent`, so reopening can
reuse the user's visual preference. Selecting a new reference trace resets to
50/50.

## AI Panel Context Contract

When `referenceTraceId` exists, the frontend sends `tracePairContext` with the
analysis request:

```json
{
  "traceId": "current-trace-id",
  "referenceTraceId": "reference-trace-id",
  "options": {
    "tracePairContext": {
      "schemaVersion": 1,
      "layout": "horizontal",
      "primarySide": "left",
      "referenceSide": "right",
      "activeSide": "left",
      "workspaceOpen": false,
      "splitPercent": 50,
      "panes": [
        {
          "side": "left",
          "traceSide": "current",
          "traceId": "current-trace-id",
          "traceName": "current.perfetto-trace",
          "active": true,
          "visualState": "live"
        },
        {
          "side": "right",
          "traceSide": "reference",
          "traceId": "reference-trace-id",
          "traceName": "reference.perfetto-trace",
          "active": false,
          "visualState": "context_only"
        }
      ],
      "aliases": {
        "left": "current",
        "right": "reference",
        "top": "current",
        "bottom": "reference",
        "current": "current",
        "reference": "reference"
      }
    }
  }
}
```

Rules:

- `current` is always the originally opened primary trace.
- `reference` is always the trace selected from the trace picker.
- Horizontal: current is left/primary, reference is right/reference.
- Vertical: current is top/primary, reference is bottom/reference.
- `activeSide` comes from the latest hovered/focused pane. When the workspace is
  closed, current is active by default.
- `visualState=live` means the pane is visible. `context_only` means the trace
  is still analyzable but not currently visible.
- Backend normalization drops illegal sides/layouts, duplicate minimized sides,
  and clamps split to 18-82.

## Frontend/Backend Coordination

| Layer | Responsibility |
| --- | --- |
| Perfetto UI main page | Opens current trace, owns AI Panel state, renders comparison bar and dual workspace overlay |
| AI Panel | Selects reference trace, builds `tracePairContext`, sends `referenceTraceId` |
| Dual workspace iframe | Loads full Perfetto timeline from workspace trace file URL, without owning a comparison session |
| `load_trace.ts` | Detects `smartperfettoDualTrace=true` and skips backend AI upload |
| Backend analyze route | Normalizes `tracePairContext` and passes `referenceTraceId` to the runtime |
| MCP registry | Exposes comparison tools only when `referenceTraceId` exists |
| Agent runtime | Uses shared comparison methodology and resolves current/reference or left/right/top/bottom references |
| Report/snapshot | Keeps the raw trace comparison evidence/report/session snapshot contract aligned with CLI `smp compare` |

## Edge Cases

- Current trace not ready: do not open comparison or dual workspace until
  `backendTraceId` is ready.
- No reference trace: show an empty picker state and ask the user to upload
  another trace.
- Reference trace file cannot be read: the affected iframe shows the Perfetto
  load failure; backend SQL/Skill calls report the actual trace-service error.
- User opens a new trace: reset to Single trace, clear reference and workspace
  state, and create/restore the new trace's own session.
- Workspace switch: clear picker results, reference, workspace state, and agent
  session; trace file URLs must use the new workspace path.
- Workspace collapsed: `referenceTraceId` remains, so future questions are still
  dual-trace comparison with `workspaceOpen=false`.
- Comparison exited: `referenceTraceId` is cleared; future requests no longer
  register comparison tools or send `tracePairContext`.
- Pane minimized/maximized: hidden panes are still analyzable and should be
  described as context-only, not missing.
- AI Panel placement: Right/Bottom/floating AI Panel placement does not change
  current/reference semantics.
- Multi-turn sessions: entering comparison drops incompatible single-trace agent
  state; exiting comparison drops comparison agent state. Provider/runtime
  pinning still follows normal session rules.

## Completion Criteria

Dual Trace Workspace changes are complete only when current evidence proves:

- Normal trace open defaults to a single timeline.
- Selecting a reference trace enters comparison context but does not auto-open
  the dual workspace.
- Clicking "Open dual window" displays two complete Perfetto timelines on the
  same page.
- Horizontal/vertical layout, dragging, minimizing, maximizing, collapsing, and
  exiting update the expected state.
- Dual workspace iframes do not create extra backend trace uploads.
- `tracePairContext` remains correct for collapsed/open, vertical/horizontal,
  and max/min states.
- Backend normalization and system prompt handling are stable for invalid or
  missing fields.
- The committed `frontend/` prebuild has been refreshed for `./start.sh`.
