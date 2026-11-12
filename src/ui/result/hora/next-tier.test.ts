import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../../core/input';
import type { Result, ScoredHora } from '../../../core/result';
import type { Table } from '../../../core/table';
import { nextTier } from './next-tier';

async function getCore() {
  const { generateResult } = await import('../../../core/result');
  const { DEFAULT_RULE } = await import('../../../core/rule');
  return { generateResult, DEFAULT_RULE };
}

function getHoras(res: Result | null): ScoredHora[] {
  if (res?.type === 'hora-shanten' && res.info.type === 'hora') {
    return res.info.hora;
  }
  throw new Error('和了判定失敗');
}

describe('next-tier.test.ts (E2 次の段階のバッジの判定)', () => {
  const defaultOptions: HandOptions = {
    riichi: 'none',
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false,
    tsubameGaeshi: false,
    kanFuri: false
  };

  const southTable: Table = {
    round: 'east',
    seat: 'south',
    continue: 0,
    deposit: 0
  };

  // R01 手牌: 234p567p34s678s99p + 2s
  const r01Hand = [
    { type: 'p', n: 2 } as const,
    { type: 'p', n: 3 } as const,
    { type: 'p', n: 4 } as const,
    { type: 'p', n: 5, red: false } as const,
    { type: 'p', n: 6 } as const,
    { type: 'p', n: 7 } as const,
    { type: 's', n: 3 } as const,
    { type: 's', n: 4 } as const,
    { type: 's', n: 6 } as const,
    { type: 's', n: 7 } as const,
    { type: 's', n: 8 } as const,
    { type: 'p', n: 9 } as const,
    { type: 'p', n: 9 } as const,
    { type: 's', n: 2 } as const
  ];

  // R10 手牌: 234p567p34s678s55p + 2s
  const r10Hand = [
    { type: 'p', n: 2 } as const,
    { type: 'p', n: 3 } as const,
    { type: 'p', n: 4 } as const,
    { type: 'p', n: 5, red: false } as const,
    { type: 'p', n: 6 } as const,
    { type: 'p', n: 7 } as const,
    { type: 's', n: 3 } as const,
    { type: 's', n: 4 } as const,
    { type: 's', n: 6 } as const,
    { type: 's', n: 7 } as const,
    { type: 's', n: 8 } as const,
    { type: 'p', n: 5, red: false } as const,
    { type: 'p', n: 5, red: false } as const,
    { type: 's', n: 2 } as const
  ];

  // R11 手牌: 123p456p789p23p99p + 4p
  const r11Hand = [
    { type: 'p', n: 1 } as const,
    { type: 'p', n: 2 } as const,
    { type: 'p', n: 3 } as const,
    { type: 'p', n: 4 } as const,
    { type: 'p', n: 5, red: false } as const,
    { type: 'p', n: 6 } as const,
    { type: 'p', n: 7 } as const,
    { type: 'p', n: 8 } as const,
    { type: 'p', n: 9 } as const,
    { type: 'p', n: 2 } as const,
    { type: 'p', n: 3 } as const,
    { type: 'p', n: 9 } as const,
    { type: 'p', n: 9 } as const,
    { type: 'p', n: 4 } as const
  ];

  // R14 手牌: 白白白 發發發 中中 123p 99s + 中
  const r14Hand = [
    { type: 'z', n: 5 } as const,
    { type: 'z', n: 5 } as const,
    { type: 'z', n: 5 } as const,
    { type: 'z', n: 6 } as const,
    { type: 'z', n: 6 } as const,
    { type: 'z', n: 6 } as const,
    { type: 'z', n: 7 } as const,
    { type: 'z', n: 7 } as const,
    { type: 'p', n: 1 } as const,
    { type: 'p', n: 2 } as const,
    { type: 'p', n: 3 } as const,
    { type: 's', n: 9 } as const,
    { type: 's', n: 9 } as const,
    { type: 'z', n: 7 } as const
  ];

  it('E2-NT1: R01 ロン 1飜30符 - ＋4飜で満貫', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toEqual({
        plusHan: 4,
        limit: 'mangan'
      });
    }
  });

  it('E2-NT2: R01 ツモ 2飜20符 - ＋3飜で満貫', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const tsumo = horas.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (tsumo) {
      expect(nextTier(tsumo.score, DEFAULT_RULE)).toEqual({
        plusHan: 3,
        limit: 'mangan'
      });
    }
  });

  it('E2-NT3: R09+抜き北3 ロン 4飜30符(切り上げ満貫なし) - ＋1飜で満貫', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const rule = { ...DEFAULT_RULE, roundedMangan: false };
    const res = generateResult(
      southTable,
      { hand: r01Hand, melds: [], dora: [], nuki: 3 },
      defaultOptions,
      rule
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, rule)).toEqual({
        plusHan: 1,
        limit: 'mangan'
      });
    }
  });

  it('E2-NT4: R09+抜き北3 ロン 4飜30符(切り上げ満貫あり) - ＋2飜で跳満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const rule = { ...DEFAULT_RULE, roundedMangan: true };
    const res = generateResult(
      southTable,
      { hand: r01Hand, melds: [], dora: [], nuki: 3 },
      defaultOptions,
      rule
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, rule)).toEqual({
        plusHan: 2,
        limit: 'haneman'
      });
    }
  });

  it('E2-NT5: R10 ロン 5飜 - ＋1飜で跳満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r10Hand, melds: [], dora: [{ type: 'p', n: 4 }], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toEqual({
        plusHan: 1,
        limit: 'haneman'
      });
    }
  });

  it('E2-NT6: R10 ツモ 6飜 - ＋2飜で倍満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r10Hand, melds: [], dora: [{ type: 'p', n: 4 }], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const tsumo = horas.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (tsumo) {
      expect(nextTier(tsumo.score, DEFAULT_RULE)).toEqual({
        plusHan: 2,
        limit: 'baiman'
      });
    }
  });

  it('E2-NT7: R11 ロン 9飜 - ＋2飜で三倍満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toEqual({
        plusHan: 2,
        limit: 'sanbaiman'
      });
    }
  });

  it('E2-NT8: R12 ロン 11飜30符(数え役満あり) - ＋2飜で数え役満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toEqual({
        plusHan: 2,
        limit: 'kazoe-yakuman'
      });
    }
  });

  it('E2-NT9: R12 ツモ 12飜20符(数え役満あり) - ＋1飜で数え役満', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const tsumo = horas.find(h => h.by === 'tsumo');
    expect(tsumo).toBeDefined();
    if (tsumo) {
      expect(nextTier(tsumo.score, DEFAULT_RULE)).toEqual({
        plusHan: 1,
        limit: 'kazoe-yakuman'
      });
    }
  });

  it('E2-NT10: R12 数え役満なし(ロン 11飜・ツモ 12飜) - 出さない (null)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const rule = { ...DEFAULT_RULE, accumlatedYakuman: false };
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      rule
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    const tsumo = horas.find(h => h.by === 'tsumo');
    expect(ron).toBeDefined();
    expect(tsumo).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, rule)).toBeNull();
    }
    if (tsumo) {
      expect(nextTier(tsumo.score, rule)).toBeNull();
    }
  });

  it('E2-NT11: R13 ロン 13飜(数え役満あり) - 出さない (null)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [{ type: 'p', n: 3 }], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toBeNull();
    }
  });

  it('E2-NT12: R13 数え役満なし(13飜・基本点6000) - 出さない (null)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const rule = { ...DEFAULT_RULE, accumlatedYakuman: false };
    const res = generateResult(
      southTable,
      { hand: r11Hand, melds: [], dora: [{ type: 'p', n: 3 }], nuki: 0 },
      { ...defaultOptions, riichi: 'riichi', ippatsu: true },
      rule
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    expect(ron).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, rule)).toBeNull();
    }
  });

  it('E2-NT13: R14 大三元(役満) - 出さない (null)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const res = generateResult(
      southTable,
      { hand: r14Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const horas = getHoras(res);
    const ron = horas.find(h => h.by === 'ron');
    const tsumo = horas.find(h => h.by === 'tsumo');
    expect(ron).toBeDefined();
    expect(tsumo).toBeDefined();
    if (ron) {
      expect(nextTier(ron.score, DEFAULT_RULE)).toBeNull();
    }
    if (tsumo) {
      expect(nextTier(tsumo.score, DEFAULT_RULE)).toBeNull();
    }
  });
});
