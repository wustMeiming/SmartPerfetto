// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {hasConcreteCodeReference} from '../codebase/codeReferenceContract';

describe('codeReferenceContract', () => {
  it.each([
    'app/src/main/java/demo/StartupHooks.kt:L10-L20',
    'filePath: app/src/main/java/demo/StartupHooks.kt, lineRange: 10-20',
    '{"filePath":"app/src/main/java/demo/StartupHooks.kt","lineRange":{"start":10,"end":20}}',
    'filePath: app/src/main/java/demo/StartupHooks.kt, chunkId: chunk-1, 行号不可用',
    'filePath = app/src/main/java/demo/StartupHooks.kt; chunkId = chunk-1; line number unavailable',
  ])('accepts a locatable source reference: %s', reference => {
    expect(hasConcreteCodeReference(reference)).toBe(true);
  });

  it.each([
    'StartupHooks.kt',
    'chunkId: chunk-1',
    'evidence_ref_id: evidence-1',
    'source_ref: source-1',
    'lookup_app_source(StartupHooks)',
    'filePath: app/src/main/java/demo/StartupHooks.kt',
    'filePath: app/src/main/java/demo/StartupHooks.kt, chunkId: chunk-1',
    'filePath and lineRange are required',
  ])('rejects a non-locatable source mention: %s', reference => {
    expect(hasConcreteCodeReference(reference)).toBe(false);
  });
});
