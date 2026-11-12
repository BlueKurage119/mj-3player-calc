import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../../core/input';
import type { HoraScore } from '../../../core/hora-score';
import type { Payment } from '../../../core/payment';
import type { Result, ScoredHora } from '../../../core/result';
import type { Table } from '../../../core/table';
import type { NormalYaku, Yakuman } from '../../../core/yaku';
import {
  formatBasePointText,
  formatFuSummary,
  limitName,
  nextTierText,
  payDetailLines,
  yakuHanText,
  yakuLabel
} from './format';

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

describe('format.ts (E2 和了文言・書式関数)', () => {
  const dummyPayment: Payment = {
    detail: { by: 'ron', discarder: { base: 1000, withHonba: 1000 } },
    total: 1000,
    honba: 0,
    deposit: 0,
    bonus: 0
  };

  const createScore = (basePoint: number, yakumanPoint = 0): HoraScore => ({
    basePoint,
    han: 1,
    fu: 30,
    yakumanPoint,
    payment: dummyPayment
  });

  it('E2-9: limitName - 満貫未満で null、満貫〜数え役満、役満〜11倍役満を正しく返し、ダブル・トリプルを含まない', () => {
    // 満貫未満 (2000未満はnull)
    expect(limitName(createScore(1920))).toBeNull();
    expect(limitName(createScore(1919))).toBeNull();
    expect(limitName(createScore(1000))).toBeNull();

    // 通常役の限度
    expect(limitName(createScore(2000))).toBe('満貫');
    expect(limitName(createScore(3000))).toBe('跳満');
    expect(limitName(createScore(4000))).toBe('倍満');
    expect(limitName(createScore(6000))).toBe('三倍満');
    expect(limitName(createScore(8000))).toBe('数え役満');

    // 役満
    expect(limitName(createScore(8000, 1))).toBe('役満');
    expect(limitName(createScore(16000, 2))).toBe('二倍役満');
    expect(limitName(createScore(24000, 3))).toBe('三倍役満');
    expect(limitName(createScore(32000, 4))).toBe('四倍役満');
    expect(limitName(createScore(88000, 11))).toBe('11倍役満');

    // 「ダブル」「トリプル」を含まないことの確認
    for (let p = 1; p <= 12; p++) {
      const name = limitName(createScore(8000 * p, p));
      expect(name).not.toContain('ダブル');
      expect(name).not.toContain('トリプル');
    }
  });

  it('E2-10: yakuLabel, yakuHanText - 役名と飜数・役満表記の組み立て', () => {
    const normalPinfu: NormalYaku = { type: 'yaku', name: 'pinfu', han: 1 };
    expect(yakuLabel(normalPinfu.name)).toBe('平和');
    expect(yakuHanText(normalPinfu)).toBe('1飜');

    const yakumanDaisangen: Yakuman = {
      type: 'yakuman',
      name: 'daisangen',
      point: 1
    };
    expect(yakuLabel(yakumanDaisangen.name)).toBe('大三元');
    expect(yakuHanText(yakumanDaisangen)).toBe('役満');

    const yakumanSuankoTanki: Yakuman = {
      type: 'yakuman',
      name: 'suanko-tanki',
      point: 2
    };
    expect(yakuLabel(yakumanSuankoTanki.name)).toBe('四暗刻単騎');
    expect(yakuHanText(yakumanSuankoTanki)).toBe('二倍役満');
    expect(yakuHanText(yakumanSuankoTanki)).not.toContain('ダブル');
  });

  it('E2-NT0: nextTierText - ＋{k}飜で{限度名} を正しくフォーマットする', () => {
    expect(nextTierText({ plusHan: 1, limit: 'haneman' })).toBe('＋1飜で跳満');
    expect(nextTierText({ plusHan: 4, limit: 'mangan' })).toBe('＋4飜で満貫');
  });

  it('E2-11: 支払い内訳・基本点・符見出しの書式化 (payDetailLines)', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();

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

    // R07: 南家・2本場・供託1本 (honbaPoint: 200, depositPoint: 1000)
    const r07Table: Table = {
      round: 'east',
      seat: 'south',
      continue: 2,
      deposit: 1
    };
    const r07Res = generateResult(
      r07Table,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const r07Horas = getHoras(r07Res);
    const r07Tsumo = r07Horas.find(h => h.by === 'tsumo');
    const r07Ron = r07Horas.find(h => h.by === 'ron');
    expect(r07Tsumo).toBeDefined();
    expect(r07Ron).toBeDefined();
    if (r07Tsumo && r07Ron) {
      expect(payDetailLines(r07Tsumo.score.payment)).toEqual([
        'は 600・900',
        '合計 1,100(+1,400)点'
      ]);
      expect(payDetailLines(r07Ron.score.payment)).toEqual([
        'は 1,400',
        '(+1,400)点'
      ]);
    }

    // 本場2・供託0 のロン (南家)
    const honba2Table: Table = {
      round: 'east',
      seat: 'south',
      continue: 2,
      deposit: 0
    };
    const honba2Res = generateResult(
      honba2Table,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const honba2Horas = getHoras(honba2Res);
    const honba2Ron = honba2Horas.find(h => h.by === 'ron');
    expect(honba2Ron).toBeDefined();
    if (honba2Ron) {
      expect(payDetailLines(honba2Ron.score.payment)).toEqual([
        'は 1,400',
        '(+400)点'
      ]);
    }

    // 本場0・供託1 のロン (南家)
    const deposit1Table: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 1
    };
    const deposit1Res = generateResult(
      deposit1Table,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const deposit1Horas = getHoras(deposit1Res);
    const deposit1Ron = deposit1Horas.find(h => h.by === 'ron');
    expect(deposit1Ron).toBeDefined();
    if (deposit1Ron) {
      expect(payDetailLines(deposit1Ron.score.payment)).toEqual(['(+1,000)点']);
    }

    // honbaPoint: 400・本場2 のロン (南家)
    const rule400 = { ...DEFAULT_RULE, honbaPoint: 400 };
    const honba400Res = generateResult(
      honba2Table,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      rule400
    );
    const honba400Horas = getHoras(honba400Res);
    const honba400Ron = honba400Horas.find(h => h.by === 'ron');
    expect(honba400Ron).toBeDefined();
    if (honba400Ron) {
      expect(payDetailLines(honba400Ron.score.payment)).toEqual([
        'は 1,800',
        '(+800)点'
      ]);
    }

    // R02: 東家 (親)・本場0・供託0
    const r02Table: Table = {
      round: 'east',
      seat: 'east',
      continue: 0,
      deposit: 0
    };
    const r02Res = generateResult(
      r02Table,
      { hand: r01Hand, melds: [], dora: [], nuki: 0 },
      defaultOptions,
      DEFAULT_RULE
    );
    const r02Horas = getHoras(r02Res);
    const r02Tsumo = r02Horas.find(h => h.by === 'tsumo');
    const r02Ron = r02Horas.find(h => h.by === 'ron');
    expect(r02Tsumo).toBeDefined();
    expect(r02Ron).toBeDefined();
    if (r02Tsumo && r02Ron) {
      expect(payDetailLines(r02Tsumo.score.payment)).toEqual(['合計 1,400点']);
      expect(payDetailLines(r02Ron.score.payment)).toEqual([]);
    }

    expect(formatBasePointText(240)).toBe('基本点 240');

    // 符見出し
    expect(formatFuSummary(30, 30, 'mentsu')).toBe('符 30');
    expect(formatFuSummary(34, 40, 'mentsu')).toBe('符 34 → 40');
    expect(formatFuSummary(25, 25, 'chitoitsu')).toBe('符 25');
  });
});
