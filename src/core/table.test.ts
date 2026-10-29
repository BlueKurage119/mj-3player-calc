import { describe, expect, test } from 'vitest';
import { type Wind, isDealer } from './table';

describe('isDealer (D1)', () => {
  test('D1: 自風東が親(true)、南・西が子(false)', () => {
    expect(
      isDealer({ round: 'east', seat: 'east', continue: 0, deposit: 0 })
    ).toBe(true);
    expect(
      isDealer({ round: 'east', seat: 'south', continue: 0, deposit: 0 })
    ).toBe(false);
    expect(
      isDealer({ round: 'east', seat: 'west', continue: 0, deposit: 0 })
    ).toBe(false);
  });
});

describe('Wind の型 (W1)', () => {
  test('W1: 北は Wind の型で表せない', () => {
    // @ts-expect-error 北は自風・場風にならない
    const w: Wind = 'north';
    expect(w).toBe('north');
  });
});
