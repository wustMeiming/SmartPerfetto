// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  androidInternalsPackQueryTokens,
} from '../androidInternalsPackStore';
import {
  __resetAndroidInternalsPackStoresForTests,
  getDefaultAndroidInternalsPackStore,
  isAndroidInternalsPackRevoked,
} from '../androidInternalsPackResolver';
import {parseAndroidInternalsPackManifest} from '../manifest';
import {
  androidInternalsPackActivePointerPath,
  androidInternalsPackChannelStatePath,
  androidInternalsPackLastKnownGoodPointerPath,
  androidInternalsPackVersionDirectory,
} from '../packPaths';
import {
  updateAndroidInternalsPack,
  type KnowledgePackTufClient,
} from '../knowledgePackUpdater';
import type {AndroidInternalsPackChannel} from '../types';
import {
  clearSessionBackgroundKnowledgeReferences,
  getSessionBackgroundKnowledgeReferences,
  registerSessionBackgroundKnowledgeReferences,
} from '../sessionBackgroundKnowledgeRegistry';
import {filterRagLookup} from '../../rag/lookupResponseFilter';
import {projectRagResultForSseAndLog} from '../../rag/toolResultProjectionFilter';
import {RagStore} from '../../ragStore';

describe('AndroidInternalsPack', () => {
  let dataRoot: string;
  const originalDataRoot = process.env.SMARTPERFETTO_BACKEND_DATA_DIR;

  beforeEach(() => {
    dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'smartperfetto-aiw-pack-test-'));
    process.env.SMARTPERFETTO_BACKEND_DATA_DIR = dataRoot;
    __resetAndroidInternalsPackStoresForTests();
  });

  afterEach(() => {
    __resetAndroidInternalsPackStoresForTests();
    if (originalDataRoot === undefined) delete process.env.SMARTPERFETTO_BACKEND_DATA_DIR;
    else process.env.SMARTPERFETTO_BACKEND_DATA_DIR = originalDataRoot;
    fs.rmSync(dataRoot, {recursive: true, force: true});
  });

  it('materializes the bundled immutable snapshot and retrieves Chinese and identifiers', () => {
    const store = getDefaultAndroidInternalsPackStore();
    expect(store?.handle).toEqual(expect.objectContaining({
      contentVersion: '2026.07.18.1',
      contentFingerprint: 'e042ba33dc8f11373082ab3150ea021c119d8985cbab87c86f571dc8a507938e',
      origin: 'bundled',
    }));

    const chinese = store?.search('Binder 线程池 性能', {topK: 3});
    expect(chinese?.probed).toEqual(['android_internals_pack']);
    expect(chinese?.results.length).toBeGreaterThan(0);
    expect(chinese?.results[0].chunk).toEqual(expect.objectContaining({
      kind: 'android_internals_pack',
      registryOrigin: 'built_in_knowledge_pack',
      knowledgePackVersion: '2026.07.18.1',
      articleId: expect.any(String),
      sectionId: expect.any(String),
      chunkHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    }));

    const identifier = store?.search('attachApplication binder_tracker', {topK: 5});
    expect(identifier?.results.length).toBeGreaterThan(0);
  });

  it('projects only citation metadata and snippet hashes to logs and SSE', async () => {
    const store = getDefaultAndroidInternalsPackStore();
    const raw = store?.search('MessageQueue Binder', {topK: 1});
    expect(raw).toBeDefined();
    const filtered = await filterRagLookup(raw!, {
      toolName: 'lookup_blog_knowledge',
      turn: 0,
    });
    expect(filtered.backgroundKnowledgeReferences).toEqual([
      expect.objectContaining({
        sourceKind: 'android_internals_pack',
        packVersion: '2026.07.18.1',
        chunkHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    ]);
    expect(filtered.hits[0].snippet).toEqual(expect.any(String));

    const projected = projectRagResultForSseAndLog('lookup_blog_knowledge', filtered);
    expect(projected.chunkRefs[0]).toEqual(expect.objectContaining({
      kind: 'android_internals_pack',
      knowledgePackVersion: '2026.07.18.1',
      snippetHash: expect.stringMatching(/^[0-9a-f]{12}$/),
      snippetLength: expect.any(Number),
    }));
    expect(projected).not.toHaveProperty('hits');
    expect(JSON.stringify(projected)).not.toContain(filtered.hits[0].snippet);
  });

  it('treats a session-pinned version as revoked after signed channel state changes', () => {
    const store = getDefaultAndroidInternalsPackStore();
    expect(store).toBeDefined();
    expect(isAndroidInternalsPackRevoked(store!.handle)).toBe(false);
    fs.mkdirSync(path.dirname(androidInternalsPackChannelStatePath()), {recursive: true});
    fs.writeFileSync(
      androidInternalsPackChannelStatePath(),
      JSON.stringify({
        checkedAt: new Date().toISOString(),
        minimumSafeVersion: '2026.07.18.1',
        revokedVersions: ['2026.07.18.1'],
      }),
    );
    expect(isAndroidInternalsPackRevoked(store!.handle)).toBe(true);
  });

  it('normalizes Han bigrams and technical identifiers deterministically', () => {
    expect(androidInternalsPackQueryTokens('Binder线程池 attachApplication foo_bar')).toEqual(
      expect.arrayContaining([
        'binder线程池',
        'binder',
        '线程',
        '程池',
        'attachapplication',
        'foo_bar',
        'foo',
        'bar',
      ]),
    );
    expect(androidInternalsPackQueryTokens('')).toEqual([]);
  });

  it('fails closed on an unsupported manifest format', () => {
    const manifest = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          '../../../../knowledge/aiw-pack/bundled/2026.07.18.1/manifest.json',
        ),
        'utf8',
      ),
    );
    expect(() => parseAndroidInternalsPackManifest({
      ...manifest,
      packFormatVersion: 2,
    })).toThrow('unsupported_aiw_pack_format_version');
  });

  it('rejects path-like Pack versions before resolving runtime data', () => {
    expect(() => androidInternalsPackVersionDirectory('../../outside')).toThrow(
      'invalid_aiw_pack_version_path',
    );
    expect(() => getDefaultAndroidInternalsPackStore({
      contentVersion: '../../outside',
    })).toThrow('invalid_aiw_pack_version_path');
  });

  it('cannot be ingested into the mutable tenant RagStore', () => {
    const mutableStore = new RagStore(path.join(dataRoot, 'rag.json'));
    expect(() => mutableStore.addChunk({
      chunkId: 'forbidden-pack-chunk',
      kind: 'android_internals_pack',
      registryOrigin: 'built_in_knowledge_pack',
      uri: 'aiw-pack://test/article',
      snippet: 'must stay immutable',
      indexedAt: Date.now(),
    })).toThrow('must use AndroidInternalsPackStore');
  });

  it('bounds and deduplicates in-memory session citations', () => {
    const sessionId = 'bounded-citations';
    registerSessionBackgroundKnowledgeReferences(
      sessionId,
      Array.from({length: 257}, (_, index) => ({
        sourceKind: 'android_internals_pack' as const,
        packVersion: '2026.07.18.1',
        packFingerprint: 'f'.repeat(64),
        sourceRevision: 'source-revision',
        articleId: `article-${index}`,
        articleTitle: `Title ${index}`,
        sectionId: `section-${index}`,
        sectionHeading: `Section ${index}`,
        chunkId: `chunk-${index}`,
        chunkHash: index.toString(16).padStart(64, '0'),
        license: 'CC-BY-NC-SA-4.0 OR LicenseRef-AIW-Commercial',
      })),
    );
    registerSessionBackgroundKnowledgeReferences(
      sessionId,
      getSessionBackgroundKnowledgeReferences(sessionId).slice(-1),
    );

    const references = getSessionBackgroundKnowledgeReferences(sessionId);
    expect(references).toHaveLength(256);
    expect(references.some(reference => reference.chunkId === 'chunk-0')).toBe(false);
    clearSessionBackgroundKnowledgeReferences(sessionId);
    expect(getSessionBackgroundKnowledgeReferences(sessionId)).toEqual([]);
  });

  it('installs a verified update atomically and keeps it searchable', async () => {
    const fixture = bundledFixture();
    const result = await updateAndroidInternalsPack({
      updaterFactory: () => fixture.client,
    });
    expect(result).toEqual(expect.objectContaining({
      status: 'installed',
      contentVersion: '2026.07.18.1',
    }));
    const active = JSON.parse(
      fs.readFileSync(path.join(dataRoot, 'knowledge-packs/android-internals/active.json'), 'utf8'),
    );
    expect(active).toEqual(expect.objectContaining({
      contentVersion: '2026.07.18.1',
      origin: 'runtime',
    }));
    __resetAndroidInternalsPackStoresForTests();
    const store = getDefaultAndroidInternalsPackStore();
    expect(store?.handle.origin).toBe('runtime');
    expect(store?.search('Binder', {topK: 1}).results).toHaveLength(1);
  });

  it('installs the signed minimum-safe immutable target when stable is revoked', async () => {
    const fixture = bundledFixture();
    fixture.channel.contentVersion = '2026.07.18.2';
    fixture.channel.contentFingerprint = 'f'.repeat(64);
    fixture.channel.sourceRevision = 'e'.repeat(40);
    fixture.channel.minimumSafeVersion = '2026.07.18.1';
    fixture.channel.revokedVersions = ['2026.07.18.2'];
    fixture.channel.targets = {
      manifest: 'packs/android-internals/2026.07.18.2/manifest.json',
      database: 'packs/android-internals/2026.07.18.2/content.sqlite.gz',
      audit: 'packs/android-internals/2026.07.18.2/audit-summary.json',
      licenses: Object.fromEntries(
        Object.keys(fixture.channel.targets.licenses).map(name => [
          name,
          `packs/android-internals/2026.07.18.2/licenses/${name}`,
        ]),
      ),
    };
    fs.writeFileSync(fixture.channelPath, JSON.stringify(fixture.channel));

    await expect(updateAndroidInternalsPack({
      updaterFactory: () => fixture.client,
    })).resolves.toEqual(expect.objectContaining({
      status: 'installed',
      contentVersion: '2026.07.18.1',
    }));
    const active = JSON.parse(
      fs.readFileSync(androidInternalsPackActivePointerPath(), 'utf8'),
    );
    expect(active.contentVersion).toBe('2026.07.18.1');
    expect(
      JSON.parse(fs.readFileSync(androidInternalsPackChannelStatePath(), 'utf8')),
    ).toEqual(expect.objectContaining({
      contentVersion: '2026.07.18.2',
      minimumSafeVersion: '2026.07.18.1',
      revokedVersions: ['2026.07.18.2'],
    }));
  });

  it('prefers a verified last-known-good runtime Pack over the bundled copy', async () => {
    const fixture = bundledFixture();
    await updateAndroidInternalsPack({updaterFactory: () => fixture.client});
    const active = JSON.parse(
      fs.readFileSync(androidInternalsPackActivePointerPath(), 'utf8'),
    );
    fs.writeFileSync(
      androidInternalsPackLastKnownGoodPointerPath(),
      JSON.stringify(active),
    );
    fs.writeFileSync(
      androidInternalsPackActivePointerPath(),
      JSON.stringify({...active, contentFingerprint: '0'.repeat(64)}),
    );
    __resetAndroidInternalsPackStoresForTests();

    expect(getDefaultAndroidInternalsPackStore()?.handle.origin).toBe('runtime');
  });

  it('does not create an active pointer when a downloaded target is corrupt', async () => {
    const fixture = bundledFixture();
    const corrupt = path.join(dataRoot, 'corrupt.sqlite.gz');
    fs.writeFileSync(corrupt, 'not a gzip database');
    fixture.targets.set(fixture.channel.targets.database, corrupt);

    await expect(updateAndroidInternalsPack({
      updaterFactory: () => fixture.client,
    })).rejects.toThrow('aiw_pack_compressed_database_mismatch');
    expect(
      fs.existsSync(path.join(dataRoot, 'knowledge-packs/android-internals/active.json')),
    ).toBe(false);
  });

  function bundledFixture(): {
    channel: AndroidInternalsPackChannel;
    channelPath: string;
    targets: Map<string, string>;
    client: KnowledgePackTufClient;
  } {
    const bundle = path.resolve(
      __dirname,
      '../../../../knowledge/aiw-pack/bundled/2026.07.18.1',
    );
    const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'manifest.json'), 'utf8'));
    const channel: AndroidInternalsPackChannel = {
      schemaVersion: 1,
      packId: 'android-internals',
      contentVersion: manifest.contentVersion,
      contentFingerprint: manifest.contentFingerprint,
      sourceRevision: manifest.sourceRevision,
      generatedAt: manifest.generatedAt,
      minimumSafeVersion: manifest.contentVersion,
      revokedVersions: [],
      reasonCode: null,
      targets: {
        manifest: 'packs/android-internals/2026.07.18.1/manifest.json',
        database: 'packs/android-internals/2026.07.18.1/content.sqlite.gz',
        audit: 'packs/android-internals/2026.07.18.1/audit-summary.json',
        licenses: Object.fromEntries(
          Object.keys(manifest.licenses.files).map(name => [
            name,
            `packs/android-internals/2026.07.18.1/licenses/${name}`,
          ]),
        ),
      },
    };
    const channelPath = path.join(dataRoot, 'stable.json');
    fs.writeFileSync(channelPath, JSON.stringify(channel));
    const targets = new Map<string, string>([
      ['channels/stable.json', channelPath],
      [channel.targets.manifest, path.join(bundle, 'manifest.json')],
      [channel.targets.database, path.join(bundle, 'content.sqlite.gz')],
      [channel.targets.audit, path.join(bundle, 'audit-summary.json')],
      ...Object.entries(channel.targets.licenses).map(([name, target]) =>
        [target, path.join(bundle, 'licenses', name)] as [string, string]),
    ]);
    const client: KnowledgePackTufClient = {
      refresh: jest.fn(async () => undefined),
      getTargetInfo: jest.fn(async targetPath => {
        const source = targets.get(targetPath);
        return source ? {path: targetPath, length: fs.statSync(source).size} : undefined;
      }),
      downloadTarget: jest.fn(async (targetInfo, destination) => {
        if (!destination) throw new Error('destination required');
        fs.copyFileSync(targets.get(targetInfo.path)!, destination);
        return destination;
      }),
    };
    return {channel, channelPath, targets, client};
  }
});
