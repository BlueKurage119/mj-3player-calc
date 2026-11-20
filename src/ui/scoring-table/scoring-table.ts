import { type Payment, calculatePayment } from '../../core/payment';
import type { Rule } from '../../core/rule';
import { calculateBasePoint } from '../../core/score';
import type { Table } from '../../core/table';
import {
  TSUMO_SEPARATOR,
  formatNumber,
  formatPoints
} from '../result/hora-summary';

export const FU_LIST = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;
export const HAN_LIST = [1, 2, 3, 4] as const;

/** 点数表が参照するルール設定 */
export type ScoringRule = Pick<
  Rule,
  | 'tsumoLoss'
  | 'honbaPoint'
  | 'depositPoint'
  | 'roundedMangan'
  | 'accumlatedYakuman'
  | 'doubleWindFu'
>;

export interface ScoringContext {
  dealer: boolean;
  /** 本場数(0以上の整数) */
  honba: number;
  /** 供託本数(0以上の整数) */
  deposit: number;
}

export type ScoringMode = 'score' | 'diff';

export type Cell =
  | { kind: 'absent' }
  | { kind: 'na' }
  | { kind: 'value'; payment: Payment; text: string; diffText: string };

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
  limit: LimitKind | 'near-mangan' | null;
}

export interface LimitRow {
  name: string;
  label: string;
  kind: LimitKind;
  ron: Cell;
  tsumo: Cell;
}

type PaymentRule = Pick<Rule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>;

const buildContextTable = (ctx: ScoringContext): Table => ({
  round: 'east',
  seat: ctx.dealer ? 'east' : 'south',
  continue: ctx.honba,
  deposit: ctx.deposit
});

const buildPaymentRule = (
  rule: Pick<ScoringRule, 'tsumoLoss' | 'honbaPoint' | 'depositPoint'>
): PaymentRule => ({
  tsumoLoss: rule.tsumoLoss,
  honbaPoint: rule.honbaPoint,
  depositPoint: rule.depositPoint
});

const isNonNegativeInt = (n: number): boolean => Number.isInteger(n) && n >= 0;

const resolveSafeInput = (
  rule: ScoringRule,
  ctx: ScoringContext
): { table: Table; paymentRule: PaymentRule } => {
  const depositValid =
    isNonNegativeInt(ctx.deposit) && isNonNegativeInt(rule.depositPoint);
  const table: Table = {
    ...buildContextTable(ctx),
    deposit: depositValid ? ctx.deposit : 0
  };
  const paymentRule: PaymentRule = {
    ...buildPaymentRule(rule),
    depositPoint: depositValid ? rule.depositPoint : 0
  };
  try {
    // ツモ側の事前検証1回で honbaPoint・continue の妥当性とツモ折半100点単位をまとめて確認する
    calculatePayment(2000, table, 'tsumo', paymentRule);
    return { table, paymentRule };
  } catch {
    return {
      table: { ...table, continue: 0 },
      paymentRule: { ...paymentRule, honbaPoint: 0 }
    };
  }
};

/** 点数表のセル向け打点表記(本場加算があるときは「は」で併記) */
export function formatCellPayment(payment: Payment): string {
  if (payment.honba === 0) {
    return formatPoints(payment, false);
  }
  const { detail } = payment;
  if (detail.by === 'ron') {
    return `${formatNumber(detail.discarder.base)} は ${formatNumber(detail.discarder.withHonba)}`;
  }
  if (detail.winner === 'dealer') {
    return `${formatNumber(detail.eachNonDealer.base)} は ${formatNumber(detail.eachNonDealer.withHonba)}オール`;
  }
  if (detail.nonDealer.base === detail.dealer.base) {
    return `${formatNumber(detail.nonDealer.base)} は ${formatNumber(detail.nonDealer.withHonba)}オール`;
  }
  return `${formatNumber(detail.nonDealer.base)}${TSUMO_SEPARATOR}${formatNumber(detail.dealer.base)} は ${formatNumber(detail.nonDealer.withHonba)}${TSUMO_SEPARATOR}${formatNumber(detail.dealer.withHonba)}`;
}

const formatDiffValue = (diff: number): string => `-${formatNumber(diff)}`;

/** 点数表のセル向け点差表記(三麻2人払い: 自分の増分 + 対象の減分、負数表示) */
export function formatCellDiff(payment: Payment): string {
  const { detail, deposit } = payment;
  if (detail.by === 'ron') {
    return formatDiffValue(2 * detail.discarder.withHonba + deposit);
  }
  if (detail.winner === 'dealer') {
    return formatDiffValue(3 * detail.eachNonDealer.withHonba + deposit);
  }
  const vsNonDealer =
    detail.dealer.withHonba + 2 * detail.nonDealer.withHonba + deposit;
  const vsDealer =
    2 * detail.dealer.withHonba + detail.nonDealer.withHonba + deposit;
  if (vsNonDealer === vsDealer) {
    return formatDiffValue(vsNonDealer);
  }
  return `${formatDiffValue(vsNonDealer)} / ${formatDiffValue(vsDealer)}`;
}

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
    text: formatCellPayment(payment),
    diffText: formatCellDiff(payment)
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
  const { table, paymentRule } = resolveSafeInput(rule, ctx);

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
      let limit: TableCell['limit'] = null;
      if (hasAnyValue) {
        if (basePoint >= 2000) {
          limit = 'mangan';
        } else if (!rule.roundedMangan && basePoint >= 1920) {
          limit = 'near-mangan';
        }
      }
      return {
        fu,
        han,
        ron: toCell(ronStatus, basePoint, table, 'ron', paymentRule),
        tsumo: toCell(tsumoStatus, basePoint, table, 'tsumo', paymentRule),
        limit
      };
    })
  );
}

interface LimitSpec {
  name: string;
  label: string;
  kind: LimitKind;
  han: number;
}

const LIMIT_SPECS_WITH_ACCUMLATED: readonly LimitSpec[] = [
  { name: '満貫', label: '5飜', kind: 'mangan', han: 5 },
  { name: '跳満', label: '6〜7飜', kind: 'haneman', han: 6 },
  { name: '倍満', label: '8〜10飜', kind: 'baiman', han: 8 },
  { name: '三倍満', label: '11〜12飜', kind: 'sanbaiman', han: 11 },
  { name: '役満', label: '13飜以上', kind: 'yakuman', han: 13 }
];

const LIMIT_SPECS_WITHOUT_ACCUMLATED: readonly LimitSpec[] = [
  { name: '満貫', label: '5飜', kind: 'mangan', han: 5 },
  { name: '跳満', label: '6〜7飜', kind: 'haneman', han: 6 },
  { name: '倍満', label: '8〜10飜', kind: 'baiman', han: 8 },
  { name: '三倍満', label: '11飜以上', kind: 'sanbaiman', han: 11 }
];

/** 満貫以上の点数表を生成する */
export function buildLimitTable(
  rule: ScoringRule,
  ctx: ScoringContext
): LimitRow[] {
  const { table, paymentRule } = resolveSafeInput(rule, ctx);
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
      name: spec.name,
      label: spec.label,
      kind: spec.kind,
      ron: makeValueCell(basePoint, table, 'ron', paymentRule),
      tsumo: makeValueCell(basePoint, table, 'tsumo', paymentRule)
    };
  });
}
