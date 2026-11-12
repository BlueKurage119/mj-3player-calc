import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import type { Payment } from '../../core/payment';
import type { ScoredHora } from '../../core/result';
import type { Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import {
  formatNumber,
  formatPoints,
  horaGlanceParts,
  isNoYaku
} from './hora-summary';

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
async function getCore() {
  const { generateResult } = await import('../../core/result');
  const { DEFAULT_RULE } = await import('../../core/rule');
  return { generateResult, DEFAULT_RULE };
}

describe('hora-summary (E2 和了要約・役なし判定・バナー打点)', () => {
  it('E2-5: isNoYaku - R20, R24, R26 で true、R19, R01, R22 で false を返す', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };

    // R01: 234p567p34s678s99p + 2s (平和) -> 役あり (false)
    const r01 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 'p', n: 7 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 'p', n: 9 },
          { type: 'p', n: 9 },
          { type: 's', n: 2 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(r01?.type).toBe('hora-shanten');
    if (r01?.type === 'hora-shanten' && r01.info.type === 'hora') {
      const ron = r01.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(false);
    }

    // R19: 444z123p456p789s9s + 9s, 北=役牌 -> 役牌:北 で役あり (false)
    const ruleYakuhai: Rule = { ...DEFAULT_RULE, north: 'yakuhai' };
    const r19 = generateResult(
      southTable,
      {
        hand: [
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 's', n: 9 },
          { type: 's', n: 9 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      ruleYakuhai
    );
    if (r19?.type === 'hora-shanten' && r19.info.type === 'hora') {
      const ron = r19.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(false);
    }

    // R20: 同上, 北=抜きドラ (DEFAULT_RULE) -> ロンは役なし (true)
    const r20 = generateResult(
      southTable,
      {
        hand: [
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 's', n: 9 },
          { type: 's', n: 9 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r20?.type === 'hora-shanten' && r20.info.type === 'hora') {
      const ron = r20.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(true);
    }

    // R22: 役満複合なし (字一色・大三元・四暗刻単騎) -> 役満なので false
    const ruleNoMultiYakuman: Rule = {
      ...DEFAULT_RULE,
      multipleYakuman: false
    };
    const r22 = generateResult(
      southTable,
      {
        hand: [
          { type: 'z', n: 1 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 },
          { type: 'z', n: 2 },
          { type: 'z', n: 5 },
          { type: 'z', n: 5 },
          { type: 'z', n: 5 },
          { type: 'z', n: 6 },
          { type: 'z', n: 6 },
          { type: 'z', n: 6 },
          { type: 'z', n: 7 },
          { type: 'z', n: 7 },
          { type: 'z', n: 7 },
          { type: 'z', n: 2 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      ruleNoMultiYakuman
    );
    if (r22?.type === 'hora-shanten' && r22.info.type === 'hora') {
      const ron = r22.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(false);
    }

    // R24: 123p456p234s789s1z + 1z -> ロンは役なし (true)
    const r24 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r24?.type === 'hora-shanten' && r24.info.type === 'hora') {
      const ron = r24.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(true);
    }

    // R26: R24 + ドラ表示 4z (ドラ2) -> ドラのみなので役なし (true)
    const r26 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 }
        ],
        melds: [],
        dora: [{ type: 'z', n: 4 }],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    if (r26?.type === 'hora-shanten' && r26.info.type === 'hora') {
      const ron = r26.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (ron) expect(isNoYaku(ron)).toBe(true);
    }
  });

  it('E2-6: isNoYaku - 懸賞役単体は true、通常役複合時は false', () => {
    const dummyScore = {
      basePoint: 1000,
      han: 1,
      fu: 30,
      yakumanPoint: 0,
      payment: {
        detail: {
          by: 'ron' as const,
          discarder: { base: 1000, withHonba: 1000 }
        },
        total: 1000,
        honba: 0,
        deposit: 0,
        bonus: 0
      }
    };
    const createHora = (yaku: ScoredHora['yaku']): ScoredHora => ({
      type: 'mentsu',
      by: 'ron',
      horaTile: { type: 'p', n: 1 },
      melds: [],
      fu: [],
      yaku,
      score: dummyScore
    });

    expect(isNoYaku(createHora([{ type: 'yaku', name: 'dora', han: 1 }]))).toBe(
      true
    );
    expect(
      isNoYaku(createHora([{ type: 'yaku', name: 'red-dora', han: 1 }]))
    ).toBe(true);
    expect(
      isNoYaku(createHora([{ type: 'yaku', name: 'nuki-dora', han: 1 }]))
    ).toBe(true);
    expect(
      isNoYaku(createHora([{ type: 'yaku', name: 'ippatsu', han: 1 }]))
    ).toBe(true);
    expect(
      isNoYaku(
        createHora([
          { type: 'yaku', name: 'ippatsu', han: 1 },
          { type: 'yaku', name: 'riichi', han: 1 }
        ])
      )
    ).toBe(false);
  });

  it('E2-6: formatNumber - 3桁区切りの手書き関数', () => {
    expect(formatNumber(700)).toBe('700');
    expect(formatNumber(1500)).toBe('1,500');
    expect(formatNumber(128000)).toBe('128,000');
  });

  it('E2-7: formatPoints - ロン打点、子ツモ打点、親ツモ打点、withHonba を正しくフォーマットする', () => {
    // ロン: 1,000
    const ronPayment: Payment = {
      detail: { by: 'ron', discarder: { base: 1000, withHonba: 1400 } },
      total: 1000,
      honba: 400,
      deposit: 0,
      bonus: 400
    };
    expect(formatPoints(ronPayment)).toBe('1,000');
    expect(formatPoints(ronPayment, true)).toBe('1,400');

    // 子ツモ: 400・700 (withHonba で R07 ツモ 600・900)
    const childTsumoPayment: Payment = {
      detail: {
        by: 'tsumo',
        winner: 'nonDealer',
        dealer: { base: 700, withHonba: 900 },
        nonDealer: { base: 400, withHonba: 600 }
      },
      total: 1100,
      honba: 400,
      deposit: 0,
      bonus: 400
    };
    expect(formatPoints(childTsumoPayment)).toBe('400・700');
    expect(formatPoints(childTsumoPayment, true)).toBe('600・900');

    // 親ツモ: 700オール
    const dealerTsumoPayment: Payment = {
      detail: {
        by: 'tsumo',
        winner: 'dealer',
        eachNonDealer: { base: 700, withHonba: 900 }
      },
      total: 1400,
      honba: 400,
      deposit: 0,
      bonus: 400
    };
    expect(formatPoints(dealerTsumoPayment)).toBe('700オール');
    expect(formatPoints(dealerTsumoPayment, true)).toBe('900オール');
  });

  it('E2-8: horaGlanceParts - R28 でロン 2,000 / ツモ 700・1,300、R24 でロン 役なし / ツモ 300・500', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };

    // R28: 13枚 234p567p34s678s99p (和了牌 2s, 5s, 赤5s)
    const r28 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 'p', n: 7 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 'p', n: 9 },
          { type: 'p', n: 9 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(r28?.type).toBe('hora-shanten');
    if (r28 && r28.type === 'hora-shanten' && r28.info.type === 'hora') {
      const parts = horaGlanceParts(r28.info.hora);
      expect(parts).toEqual([
        { by: 'ron', kind: 'points', text: '2,000' },
        { by: 'tsumo', kind: 'points', text: '700・1,300' }
      ]);
    }

    // R24: 14枚 123p456p234s789s1z + 1z
    const r24 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );
    expect(r24?.type).toBe('hora-shanten');
    if (r24 && r24.type === 'hora-shanten' && r24.info.type === 'hora') {
      const parts = horaGlanceParts(r24.info.hora);
      expect(parts).toEqual([
        { by: 'ron', kind: 'no-yaku' },
        { by: 'tsumo', kind: 'points', text: '300・500' }
      ]);
    }
  });
});
