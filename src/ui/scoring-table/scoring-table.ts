import { type Payment, calculatePayment } from '../../core/payment';
import type { Rule } from '../../core/rule';
import { calculateBasePoint } from '../../core/score';
import type { Table } from '../../core/table';
import { formatPoints } from '../result/hora-summary';

export const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const HAN_LIST = [1, 2, 3, 4] as const;

/** 点数表が参照するルール設定 */
export type ScoringRule = Pick<
  Rule,
  'tsumoLoss' | 'roundedMangan' | 'accumlatedYakuman' | 'doubleWindFu'
>;

export interface ScoringContext {
  dealer: boolean;
}

export type Cell =
  | { kind: 'absent' }
  | { kind: 'na' }
  | { kind: 'value'; payment: Payment; text: string };

export type LimitKind =
  | 'mangan'
  | 'haneman'
  | 'baiman'
  | 'sanbaiman'
  | 'yakuman';

export interface TableCell {
  fu: number;
  han: number;
  ron: Cell;
  tsumo: Cell;
  limit: LimitKind | null;
}

export interface LimitRow {
  label: string;
  kind: LimitKind;
  ron: Cell;
  tsumo: Cell;
}

type PaymentRule = Pick<Rule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>;

const buildContextTable = (dealer: boolean): Table => ({
  round: 'east',
  seat: dealer ? 'east' : 'south',
  continue: 0,
  deposit: 0
});

const buildPaymentRule = (tsumoLoss: Rule['tsumoLoss']): PaymentRule => ({
  tsumoLoss,
  honbaPoint: 0,
  depositPoint: 0
});

const makeValueCell = (
  basePoint: number,
  table: Table,
  by: 'ron' | 'tsumo',
  paymentRule: PaymentRule
): Cell => {
  const payment = calculatePayment(basePoint, table, by, paymentRule);
  return {
    kind: 'value',
    payment,
    text: formatPoints(payment)
  };
};

const toCell = (
  status: 'absent' | 'na' | 'ok',
  basePoint: number,
  table: Table,
  by: 'ron' | 'tsumo',
  paymentRule: PaymentRule
): Cell => {
  if (status !== 'ok') {
    return { kind: status };
  }
  return makeValueCell(basePoint, table, by, paymentRule);
};

/** 符・飜・和了方法ごとの欄の成立可否を返す */
export function cellExists(
  fu: number,
  han: number,
  by: 'ron' | 'tsumo',
  doubleWindFu: 2 | 4
): 'absent' | 'na' | 'ok' {
  // N2: 20符1飜・25符1飜は存在しない
  if (fu < 30 && han === 1) {
    return 'absent';
  }
  // N4: 110符1飜は連風牌雀頭4符のロン時のみ成立し、ツモは不可、2符なら欄ごと空欄
  if (fu === 110 && han === 1) {
    if (doubleWindFu === 2) {
      return 'absent';
    }
    return by === 'tsumo' ? 'na' : 'ok';
  }
  // N1: 20符はロン不可
  if (fu === 20 && by === 'ron') {
    return 'na';
  }
  // N3: 25符2飜はツモ不可
  if (fu === 25 && han === 2 && by === 'tsumo') {
    return 'na';
  }
  return 'ok';
}

/** 1〜4飜 × 符(20〜110)の点数表を生成する */
export function buildFuHanTable(
  rule: ScoringRule,
  ctx: ScoringContext
): TableCell[][] {
  const table = buildContextTable(ctx.dealer);
  const paymentRule = buildPaymentRule(rule.tsumoLoss);

  return FU_LIST.map(fu =>
    HAN_LIST.map(han => {
      const ronStatus = cellExists(fu, han, 'ron', rule.doubleWindFu);
      const tsumoStatus = cellExists(fu, han, 'tsumo', rule.doubleWindFu);
      const basePoint = calculateBasePoint(
        fu,
        han,
        rule.roundedMangan,
        rule.accumlatedYakuman
      );
      const hasAnyValue = ronStatus === 'ok' || tsumoStatus === 'ok';
      return {
        fu,
        han,
        ron: toCell(ronStatus, basePoint, table, 'ron', paymentRule),
        tsumo: toCell(tsumoStatus, basePoint, table, 'tsumo', paymentRule),
        limit: hasAnyValue && basePoint >= 2000 ? 'mangan' : null
      };
    })
  );
}

interface LimitSpec {
  label: string;
  kind: LimitKind;
  han: number;
}

const LIMIT_SPECS_WITH_ACCUMLATED: readonly LimitSpec[] = [
  { label: '5飜', kind: 'mangan', han: 5 },
  { label: '6〜7飜', kind: 'haneman', han: 6 },
  { label: '8〜10飜', kind: 'baiman', han: 8 },
  { label: '11〜12飜', kind: 'sanbaiman', han: 11 },
  { label: '13飜以上', kind: 'yakuman', han: 13 }
];

const LIMIT_SPECS_WITHOUT_ACCUMLATED: readonly LimitSpec[] = [
  { label: '5飜', kind: 'mangan', han: 5 },
  { label: '6〜7飜', kind: 'haneman', han: 6 },
  { label: '8〜10飜', kind: 'baiman', han: 8 },
  { label: '11飜以上', kind: 'sanbaiman', han: 11 }
];

/** 満貫以上の点数表を生成する */
export function buildLimitTable(
  rule: ScoringRule,
  ctx: ScoringContext
): LimitRow[] {
  const table = buildContextTable(ctx.dealer);
  const paymentRule = buildPaymentRule(rule.tsumoLoss);
  const specs = rule.accumlatedYakuman
    ? LIMIT_SPECS_WITH_ACCUMLATED
    : LIMIT_SPECS_WITHOUT_ACCUMLATED;

  return specs.map(spec => {
    const basePoint = calculateBasePoint(
      30,
      spec.han,
      rule.roundedMangan,
      rule.accumlatedYakuman
    );
    return {
      label: spec.label,
      kind: spec.kind,
      ron: makeValueCell(basePoint, table, 'ron', paymentRule),
      tsumo: makeValueCell(basePoint, table, 'tsumo', paymentRule)
    };
  });
}
