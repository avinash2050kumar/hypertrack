import { describe, expect, it } from 'vitest';

import {
  formatCompact,
  formatDuration,
  formatLeverage,
  formatNumber,
  formatPct,
  formatPnl,
  formatPrice,
  formatRatio,
  formatRelativeTime,
  formatSize,
  formatUsd,
  shortAddress,
} from '../../src/domain';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatUsd', () => {
  it('should format with two decimals and thousands separators', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('should use a true minus sign for negatives', () => {
    expect(formatUsd(-42)).toBe('−$42.00');
  });

  it('should compact values of a million or more by default', () => {
    expect(formatUsd(2_500_000)).toBe('$2.50M');
    expect(formatUsd(999_999)).toBe('$999,999.00');
  });

  it('should honour explicit compact modes', () => {
    expect(formatUsd(1_500, { compact: 'always' })).toBe('$1.50K');
    expect(formatUsd(5_000_000, { compact: 'never' })).toBe('$5,000,000.00');
  });

  it('should add a plus sign only when signed', () => {
    expect(formatUsd(10, { signed: true })).toBe('+$10.00');
    expect(formatUsd(10)).toBe('$10.00');
  });

  it('should render values that round to zero without a sign', () => {
    expect(formatUsd(-0.001, { signed: true })).toBe('$0.00');
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])(
    'should render %s as an em dash',
    (value) => {
      expect(formatUsd(value)).toBe('—');
    },
  );
});

describe('formatPnl', () => {
  it('should always show the sign', () => {
    expect(formatPnl(25)).toBe('+$25.00');
    expect(formatPnl(-25)).toBe('−$25.00');
  });
});

describe('formatPct', () => {
  it('should convert a ratio into a percentage', () => {
    expect(formatPct(0.1234)).toBe('12.34%');
  });

  it('should sign percentages when asked', () => {
    expect(formatPct(0.05, { signed: true })).toBe('+5.00%');
    expect(formatPct(-0.05, { signed: true })).toBe('−5.00%');
  });

  it('should respect the requested precision', () => {
    expect(formatPct(0.12345, { decimals: 1 })).toBe('12.3%');
  });

  it('should collapse tiny values to an unsigned zero', () => {
    expect(formatPct(-0.00001, { signed: true })).toBe('0.00%');
  });

  it('should render missing values as an em dash', () => {
    expect(formatPct(null)).toBe('—');
  });
});

describe('number formatting', () => {
  it('should format plain numbers with a true minus sign', () => {
    expect(formatNumber(-1234.567)).toBe('−1,234.57');
    expect(formatNumber(3, 0)).toBe('3');
  });

  it('should compact thousands', () => {
    expect(formatCompact(12_345)).toBe('12.35K');
    expect(formatCompact(-999)).toBe('−999.00');
  });

  it('should scale price precision to the magnitude', () => {
    expect(formatPrice(65_000.123)).toBe('65,000.12');
    expect(formatPrice(1.23456)).toBe('1.2346');
    expect(formatPrice(0.000123456)).toBe('0.00012346');
  });

  it('should scale size precision to the magnitude', () => {
    expect(formatSize(0.12345)).toBe('0.1235');
    expect(formatSize(250.5)).toBe('250.50');
    expect(formatSize(2_000_000)).toBe('2.00M');
  });

  it('should append a suffix to ratios', () => {
    expect(formatRatio(1.5, '×')).toBe('1.50×');
  });

  it('should show whole leverage without decimals', () => {
    expect(formatLeverage(20)).toBe('20×');
    expect(formatLeverage(2.55)).toBe('2.5×');
  });
});

describe('formatDuration', () => {
  it.each([
    [45_000, '45s'],
    [5 * MINUTE, '5m'],
    [2 * HOUR, '2h'],
    [2 * HOUR + 30 * MINUTE, '2h 30m'],
    [3 * DAY, '3d'],
    [3 * DAY + 4 * HOUR, '3d 4h'],
  ])('should format %i ms as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it('should reject negative durations', () => {
    expect(formatDuration(-1)).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  const now = 1_700_000_000_000;

  it('should say "just now" within ten seconds', () => {
    expect(formatRelativeTime(now - 5_000, now)).toBe('just now');
  });

  it('should use the largest unit for older times', () => {
    expect(formatRelativeTime(now - 3 * HOUR - 20 * MINUTE, now)).toBe('3h ago');
  });

  it('should treat future timestamps as just now', () => {
    expect(formatRelativeTime(now + HOUR, now)).toBe('just now');
  });
});

describe('shortAddress', () => {
  it('should keep the prefix and suffix of long addresses', () => {
    expect(shortAddress('0x9e8b1e51c642f4c8b87c6ba11c53d516a218afc4')).toBe('0x9e8b…afc4');
  });

  it('should leave short strings untouched', () => {
    expect(shortAddress('0x1234')).toBe('0x1234');
  });
});
