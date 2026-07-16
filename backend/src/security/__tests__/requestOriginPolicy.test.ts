// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  isCorsOriginAllowed,
  isLoopbackRequestHostname,
  normalizeCorsOrigins,
} from '../requestOriginPolicy';

describe('request origin policy', () => {
  const allowed = normalizeCorsOrigins(['http://localhost:10000', 'https://perf.example']);

  it('matches the complete origin instead of trusting a frontend port', () => {
    expect(isCorsOriginAllowed('http://localhost:10000', allowed)).toBe(true);
    expect(isCorsOriginAllowed('https://perf.example/', allowed)).toBe(true);
    expect(isCorsOriginAllowed('http://evil.example:10000', allowed)).toBe(false);
    expect(isCorsOriginAllowed('http://localhost:10000.evil.example', allowed)).toBe(false);
  });

  it('recognizes only loopback hostnames in keyless local mode', () => {
    expect(isLoopbackRequestHostname('localhost')).toBe(true);
    expect(isLoopbackRequestHostname('127.0.0.42')).toBe(true);
    expect(isLoopbackRequestHostname('[::1]')).toBe(true);
    expect(isLoopbackRequestHostname('evil.example')).toBe(false);
    expect(isLoopbackRequestHostname('192.168.1.10')).toBe(false);
  });
});
