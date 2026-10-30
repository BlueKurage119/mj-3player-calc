import { calculateTableBonus } from './bonus';
import type { Rule } from './rule';
import { ceil100 } from './score';
import { type Table, isDealer } from './table';

/** 1人の支払者の負担額 */
export interface PaymentShare {
  /** 本場抜き */
  base: number;
  /** 本場込み(本場が0なら base と同じ) */
  withHonba: number;
}

export type PaymentDetail =
  | { by: 'ron'; discarder: PaymentShare }
  | { by: 'tsumo'; winner: 'dealer'; eachNonDealer: PaymentShare }
  | {
      by: 'tsumo';
      winner: 'nonDealer';
      dealer: PaymentShare;
      nonDealer: PaymentShare;
    };

export interface Payment {
  detail: PaymentDetail;
  /**
   * 和了者の受け取りのうち打点分(本場・供託を含まない)。
   * ロン: discarder.base
   * ツモ・和了者が子: dealer.base + nonDealer.base
   * ツモ・和了者が親: eachNonDealer.base × 2
   */
  total: number;
  /** 本場による加算額。ロン: ronFromDiscarder、ツモ: tsumoFromEach × 2 */
  honba: number;
  /** 供託による加算額(calculateTableBonus の deposit) */
  deposit: number;
  /** 加算額の合計 = honba + deposit(表示「合計 total(+bonus)点」の括弧内) */
  bonus: number;
}

export const calculatePayment = (
  basePoint: number,
  table: Table,
  by: 'ron' | 'tsumo',
  rule: Pick<Rule, 'tsumoLoss' | 'honbaPoint'>
): Payment => {
  // 0. 入口の検証(設計書 §4.3 手順0)
  // 0-a. 基本点: 正の整数であること
  if (!Number.isInteger(basePoint) || basePoint <= 0) {
    throw new Error('基本点は正の整数である必要があります');
  }

  // 0-b. ツモ損: 'loss' | 'north-split' | 'ron-split' のいずれかであること
  if (
    rule.tsumoLoss !== 'loss' &&
    rule.tsumoLoss !== 'north-split' &&
    rule.tsumoLoss !== 'ron-split'
  ) {
    throw new Error('ツモ損の設定が不正です');
  }

  // 0-c. 本場の点数: 0以上の整数であること
  if (!Number.isInteger(rule.honbaPoint) || rule.honbaPoint < 0) {
    throw new Error('1本場あたりの点数は0以上の整数である必要があります');
  }

  // 1. calculateTableBonus の呼び出し(例外は捕獲せずそのまま投げる)
  const bonus = calculateTableBonus(table, by, rule.honbaPoint);

  // 2. 和了者の親子および方式に応じた本場抜きの負担額の計算
  const dealerWinner = isDealer(table);

  if (by === 'ron') {
    const base = dealerWinner ? ceil100(6 * basePoint) : ceil100(4 * basePoint);
    const discarder: PaymentShare = {
      base,
      withHonba: base + bonus.ronFromDiscarder
    };
    return {
      detail: { by: 'ron', discarder },
      total: base,
      honba: bonus.ronFromDiscarder,
      deposit: bonus.deposit,
      bonus: bonus.ronFromDiscarder + bonus.deposit
    };
  }

  // ツモ
  const honba = bonus.tsumoFromEach * 2;
  const deposit = bonus.deposit;
  const totalBonus = honba + deposit;

  if (dealerWinner) {
    let eachNonDealerBase: number;
    switch (rule.tsumoLoss) {
      case 'loss':
        eachNonDealerBase = ceil100(2 * basePoint);
        break;
      case 'north-split': {
        const northShare = ceil100(2 * basePoint);
        eachNonDealerBase = ceil100(northShare + northShare / 2);
        break;
      }
      case 'ron-split':
        eachNonDealerBase = ceil100(3 * basePoint);
        break;
    }

    const eachNonDealer: PaymentShare = {
      base: eachNonDealerBase,
      withHonba: eachNonDealerBase + bonus.tsumoFromEach
    };

    return {
      detail: { by: 'tsumo', winner: 'dealer', eachNonDealer },
      total: eachNonDealerBase * 2,
      honba,
      deposit,
      bonus: totalBonus
    };
  }

  // 子のツモ
  let dealerBase: number;
  let nonDealerBase: number;
  switch (rule.tsumoLoss) {
    case 'loss':
      nonDealerBase = ceil100(basePoint);
      dealerBase = ceil100(2 * basePoint);
      break;
    case 'north-split': {
      const northShare = ceil100(basePoint);
      nonDealerBase = ceil100(northShare + northShare / 2);
      dealerBase = ceil100(ceil100(2 * basePoint) + northShare / 2);
      break;
    }
    case 'ron-split':
      nonDealerBase = ceil100(2 * basePoint);
      dealerBase = ceil100(2 * basePoint);
      break;
  }

  const dealer: PaymentShare = {
    base: dealerBase,
    withHonba: dealerBase + bonus.tsumoFromEach
  };
  const nonDealer: PaymentShare = {
    base: nonDealerBase,
    withHonba: nonDealerBase + bonus.tsumoFromEach
  };

  return {
    detail: { by: 'tsumo', winner: 'nonDealer', dealer, nonDealer },
    total: dealerBase + nonDealerBase,
    honba,
    deposit,
    bonus: totalBonus
  };
};
