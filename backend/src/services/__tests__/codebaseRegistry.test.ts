// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {afterEach, beforeEach, describe, expect, it} from '@jest/globals';

import {CodebaseRegistry} from '../codebase/codebaseRegistry';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codebase-registry-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, {recursive: true, force: true});
});

describe('CodebaseRegistry', () => {
  it('registers codebases and exposes summaries without rootPath', () => {
    const registry = new CodebaseRegistry(path.join(tmpDir, 'registry.json'));
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'HighPerformance',
      rootPath: tmpDir,
      sendToProvider: true,
      userId: 'user-a',
    });

    expect(ref.rootRealpath).toBe(fs.realpathSync(tmpDir));
    expect(ref.consent.sendToProvider).toBe(true);
    registry.updateIngestStatus(ref.codebaseId, {
      lastIngestStatus: 'partial',
      lastIngestAt: 123,
      lastIngestError: 'one file was skipped',
      chunkCount: 7,
      blockedFileCount: 1,
      redactionHitCount: 2,
    }, {userId: 'user-a'});
    const summary = registry.list({userId: 'user-a'})[0] as any;
    expect(summary.codebaseId).toBe(ref.codebaseId);
    expect(summary.rootPath).toBeUndefined();
    expect(summary.eligibleForSendToProvider).toBe(true);
    expect(summary).toMatchObject({
      lastIngestStatus: 'partial',
      lastIngestAt: 123,
      lastIngestError: 'one file was skipped',
      chunkCount: 7,
      blockedFileCount: 1,
      redactionHitCount: 2,
    });
  });

  it('persists across instances', () => {
    const registryPath = path.join(tmpDir, 'registry.json');
    const registry = new CodebaseRegistry(registryPath);
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'App',
      rootPath: tmpDir,
    });
    const reloaded = new CodebaseRegistry(registryPath);
    expect(reloaded.get(ref.codebaseId)?.displayName).toBe('App');
  });

  it('deletes a registration only while holding its ingest lease', async () => {
    const registryPath = path.join(tmpDir, 'registry.json');
    const registry = new CodebaseRegistry(registryPath);
    const scope = {tenantId: 'tenant-a', workspaceId: 'workspace-a', userId: 'user-a'};
    const ref = registry.register({
      kind: 'app_source',
      displayName: 'Private App',
      rootPath: tmpDir,
      ...scope,
    });

    const deleted = await registry.withIngestLease(ref.codebaseId, scope, lease => {
      const deleting = lease.beginDeletion('user-a');
      expect(deleting.lifecycleState).toBe('deleting');
      expect(deleting.consent.sendToProvider).toBe(false);
      return lease.deleteRegistration();
    }, 'delete');

    expect(deleted.codebaseId).toBe(ref.codebaseId);
    expect(registry.get(ref.codebaseId, scope)).toBeUndefined();
    expect(new CodebaseRegistry(registryPath).get(ref.codebaseId, scope)).toBeUndefined();
    await expect(registry.withIngestLease(ref.codebaseId, scope, () => undefined))
      .rejects.toThrow(`Codebase '${ref.codebaseId}' not found`);
  });
});
