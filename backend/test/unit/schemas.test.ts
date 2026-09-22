import { describe, expect, it } from 'vitest';

import {
  addressParamsSchema,
  batchBodySchema,
  fillsQuerySchema,
  parseAddress,
  windowQuerySchema,
} from '../../src/domain/index.js';
import { ADDRESS } from '../helpers/fixtures.js';

describe('parseAddress', () => {
  it('should lowercase a valid checksummed address', () => {
    expect(parseAddress(ADDRESS.toUpperCase().replace('0X', '0x'))).toBe(ADDRESS);
  });

  it('should trim surrounding whitespace', () => {
    expect(parseAddress(`  ${ADDRESS}\n`)).toBe(ADDRESS);
  });

  it.each([
    '',
    '0x',
    ADDRESS.slice(0, -1),
    `${ADDRESS}0`,
    ADDRESS.replace('0x', ''),
    ADDRESS.replace('a', 'g'),
    `0X${ADDRESS.slice(2)}`,
  ])('should reject %j', (input) => {
    expect(parseAddress(input)).toBeNull();
  });
});

describe('addressParamsSchema', () => {
  it('should explain the expected format on failure', () => {
    const result = addressParamsSchema.safeParse({ address: '0x123' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Expected a 0x-prefixed 40-character hex address',
    );
  });
});

describe('windowQuerySchema', () => {
  it('should default to the 7d window', () => {
    expect(windowQuerySchema.parse({})).toEqual({ window: '7d' });
  });

  it.each(['24h', '7d', '30d', 'all'])('should accept the %s window', (window) => {
    expect(windowQuerySchema.parse({ window })).toEqual({ window });
  });

  it.each(['1y', '7D', '', 'week'])('should reject the %j window', (window) => {
    expect(windowQuerySchema.safeParse({ window }).success).toBe(false);
  });
});

describe('fillsQuerySchema', () => {
  it('should default the limit to 100', () => {
    expect(fillsQuerySchema.parse({})).toEqual({ limit: 100 });
  });

  it('should coerce query-string numbers', () => {
    expect(fillsQuerySchema.parse({ limit: '250', before: '1700000000000', after: '0' })).toEqual({
      limit: 250,
      before: 1_700_000_000_000,
      after: 0,
    });
  });

  it('should accept the boundary limits of 1 and 500', () => {
    expect(fillsQuerySchema.parse({ limit: '1' }).limit).toBe(1);
    expect(fillsQuerySchema.parse({ limit: '500' }).limit).toBe(500);
  });

  it.each([
    { limit: '0' },
    { limit: '501' },
    { limit: '2.5' },
    { limit: 'abc' },
    { before: '0' },
    { before: '-1' },
    { after: '-1' },
    { coin: '' },
    { coin: 'X'.repeat(41) },
  ])('should reject %j', (query) => {
    expect(fillsQuerySchema.safeParse(query).success).toBe(false);
  });

  it('should trim the coin filter', () => {
    expect(fillsQuerySchema.parse({ coin: ' ETH ' }).coin).toBe('ETH');
  });
});

describe('batchBodySchema', () => {
  it('should accept up to 25 addresses', () => {
    const addresses = Array.from({ length: 25 }, () => ADDRESS);

    expect(batchBodySchema.parse({ addresses })).toEqual({ addresses, window: '7d' });
  });

  it('should reject an empty list', () => {
    const result = batchBodySchema.safeParse({ addresses: [] });

    expect(result.error?.issues[0]?.message).toBe('Provide at least one address');
  });

  it('should reject more than 25 addresses', () => {
    const result = batchBodySchema.safeParse({
      addresses: Array.from({ length: 26 }, () => ADDRESS),
    });

    expect(result.error?.issues[0]?.message).toBe('At most 25 addresses per batch');
  });

  it('should reject non-string entries and a missing list', () => {
    expect(batchBodySchema.safeParse({ addresses: [1, 2] }).success).toBe(false);
    expect(batchBodySchema.safeParse({}).success).toBe(false);
  });
});
