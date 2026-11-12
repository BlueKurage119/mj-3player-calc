import { describe, expect, it } from 'vitest';
import type { HoraScore } from '../../../core/hora-score';
import type { Payment } from '../../../core/payment';
import type { NormalYaku, Yakuman } from '../../../core/yaku';
import {
  formatBasePointText,
  formatFuSummary,
  formatHonbaText,
  formatPointsWithHonba,
  formatTotalText,
  limitName,
  yakuHanText,
  yakuLabel
} from './format';

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

  it('E2-11: 支払い・本場・合計・基本点・符見出しの書式化', () => {
    // 本場込み
    const ronPayment: Payment = {
      detail: { by: 'ron', discarder: { base: 1000, withHonba: 1400 } },
      total: 1000,
      honba: 400,
      deposit: 1000,
      bonus: 1400
    };
    expect(formatPointsWithHonba(ronPayment)).toBe('1400');
    expect(formatHonbaText(ronPayment)).toBe('は 1400');
    expect(formatTotalText(ronPayment)).toBe('合計 1000(+1400)点');
    expect(formatBasePointText(240)).toBe('基本点 240');

    // ツモの本場込み
    const tsumoPayment: Payment = {
      detail: {
        by: 'tsumo',
        winner: 'nonDealer',
        dealer: { base: 700, withHonba: 900 },
        nonDealer: { base: 400, withHonba: 600 }
      },
      total: 1100,
      honba: 400,
      deposit: 1000,
      bonus: 1400
    };
    expect(formatPointsWithHonba(tsumoPayment)).toBe('600·900');
    expect(formatHonbaText(tsumoPayment)).toBe('は 600·900');
    expect(formatTotalText(tsumoPayment)).toBe('合計 1100(+1400)点');

    // 親ツモの本場込み
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
    expect(formatPointsWithHonba(dealerTsumoPayment)).toBe('900オール');
    expect(formatHonbaText(dealerTsumoPayment)).toBe('は 900オール');

    // 符見出し
    expect(formatFuSummary(30, 30, 'mentsu')).toBe('符 30');
    expect(formatFuSummary(34, 40, 'mentsu')).toBe('符 34 → 40');
    expect(formatFuSummary(25, 25, 'chitoitsu')).toBe('符 25');
  });
});
