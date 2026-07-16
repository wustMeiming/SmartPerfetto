// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

function normalizeOrigin(origin: string): string | undefined {
  try {
    const url = new URL(origin);
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol)) return undefined;
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

export function isCorsOriginAllowed(
  requestOrigin: string,
  allowedOrigins: ReadonlySet<string>,
): boolean {
  const normalized = normalizeOrigin(requestOrigin);
  return normalized !== undefined && allowedOrigins.has(normalized);
}

export function normalizeCorsOrigins(origins: readonly string[]): ReadonlySet<string> {
  return new Set(origins.flatMap(origin => {
    const normalized = normalizeOrigin(origin.replace(/\/+$/, ''));
    return normalized ? [normalized] : [];
  }));
}

export function isLoopbackRequestHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === 'localhost' || normalized === '::1') return true;
  const ipv4 = normalized.split('.').map(part => Number(part));
  return ipv4.length === 4 && ipv4.every(part => Number.isInteger(part) && part >= 0 && part <= 255) && ipv4[0] === 127;
}
