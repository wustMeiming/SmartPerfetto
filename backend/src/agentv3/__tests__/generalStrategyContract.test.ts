// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2024-2026 Gracker (Chris)
// This file is part of SmartPerfetto. See LICENSE for details.

import {describe, expect, it} from '@jest/globals';
import {loadStrategies} from '../strategyLoader';

describe('general strategy contract', () => {
  it('bounds secondary-bottleneck closure for open-ended investigations', () => {
    const strategy = loadStrategies().get('general');

    expect(strategy).toBeDefined();
    expect(strategy?.content).toContain('最多检查 3 个');
    expect(strategy?.content).toContain('具体且范围明确');
    expect(strategy?.content).toContain('重复已有证据');
    expect(strategy?.content).toContain('缺失数据');
    expect(strategy?.content).toContain('未解决的替代解释');
  });
});
