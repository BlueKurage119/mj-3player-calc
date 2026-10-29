import type { Rule } from './rule';
import type { Table } from './table';

/** 供託1本あたりの点数(mahjong-rules.md §3.2。設定化は B1) */
export const DEPOSIT_POINT = 1000;

export interface TableBonus {
  /** ロン: 放銃者が払う本場の額。ツモでは 0 */
  ronFromDiscarder: number;
  /** ツモ: ツモられた2人がそれぞれ払う本場の額。ロンでは 0 */
  tsumoFromEach: number;
  /** 和了者が受け取る供託の額(本数×DEPOSIT_POINT) */
  deposit: number;
}

export const calculateTableBonus = (
  table: Table,
  by: 'ron' | 'tsumo',
  honbaPoint: Rule['honbaPoint']
): TableBonus => {
  // 1. 入口の検証(オーナー回答Q2)
  if (
    !Number.isInteger(table.continue) ||
    table.continue < 0 ||
    !Number.isInteger(table.deposit) ||
    table.deposit < 0
  ) {
    throw new Error('本場数および供託本数は0以上の整数である必要があります');
  }

  const deposit = DEPOSIT_POINT * table.deposit;

  if (by === 'ron') {
    return {
      ronFromDiscarder: honbaPoint * table.continue,
      tsumoFromEach: 0,
      deposit
    };
  }

  // 3. ツモ
  // 【未確定】端数処理は Epic B で確定する。それまでは例外を投げる
  const half = (honbaPoint * table.continue) / 2;
  if (!Number.isInteger(half) || half % 100 !== 0) {
    throw new Error('ツモ折半の額が100の倍数ではありません');
  }

  return {
    ronFromDiscarder: 0,
    tsumoFromEach: half,
    deposit
  };
};
