import { describe, expect, it } from 'vitest';

import { isTimeWindow, parseAddress } from '../../src/domain';
import { ADDRESS } from '../utils/fixtures';

describe('parseAddress', () => {
  it('should normalise a valid address to lowercase', () => {
    expect(parseAddress(`  0x${ADDRESS.slice(2).toUpperCase()} `)).toBe(ADDRESS);
  });

  it.each(['', '0x', 'hello', ADDRESS.slice(0, 41), `${ADDRESS}ff`, ADDRESS.replace('9', 'z')])(
    'should reject %j',
    (input) => {
      expect(parseAddress(input)).toBeNull();
    },
  );
});

describe('isTimeWindow', () => {
  it.each(['24h', '7d', '30d', 'all'])('should accept %s', (value) => {
    expect(isTimeWindow(value)).toBe(true);
  });

  it.each(['1y', '', null, undefined, 7])('should reject %j', (value) => {
    expect(isTimeWindow(value)).toBe(false);
  });
});
