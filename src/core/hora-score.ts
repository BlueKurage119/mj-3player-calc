import { sumOfFu } from './fu';
import type { Hora } from './hora';
import { type Payment, calculatePayment } from './payment';
import type { Rule } from './rule';
import { calculateBasePoint, ceil10, yakumanMultiplier } from './score';
import type { Table } from './table';

export interface HoraScore {
  /** 基本点。役満は 8000 × yakumanPoint、それ以外は calculateBasePoint の値 */
  basePoint: number;
  /** 通常役の飜の合計。役満の和了では 0 */
  han: number;
  /** 切り上げ後の符(七対子は 25)。役満の和了、および国士・十三不塔の形では null */
  fu: number | null;
  /** 基本点に用いた役満の倍数(yakumanMultiplier の値)。役満でなければ 0 */
  yakumanPoint: number;
  /** calculatePayment(basePoint, table, hora.by, rule) の結果 */
  payment: Payment;
}

export const calculateHoraScore = (
  hora: Hora,
  table: Table,
  rule: Rule
): HoraScore => {
  const yakumanPoint = yakumanMultiplier(hora.yaku, rule.multipleYakuman);
  let basePoint: number;
  let han: number;
  let fu: number | null;

  if (yakumanPoint > 0) {
    basePoint = 8000 * yakumanPoint;
    han = 0;
    fu = null;
  } else {
    han = hora.yaku.reduce(
      (sum, y) => sum + (y.type === 'yaku' ? y.han : 0),
      0
    );
    fu =
      hora.type === 'mentsu'
        ? ceil10(sumOfFu(hora.fu))
        : hora.type === 'chitoitsu'
          ? 25
          : null;
    basePoint = calculateBasePoint(
      fu ?? 0,
      han,
      rule.roundedMangan,
      rule.accumlatedYakuman
    );
  }

  const payment = calculatePayment(basePoint, table, hora.by, rule);

  return {
    basePoint,
    han,
    fu,
    yakumanPoint,
    payment
  };
};
