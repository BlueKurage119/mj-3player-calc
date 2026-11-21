// 和了の要約・役なし判定・バナー用純関数
// 初回 JS に含まれるため、遅延チャンクのモジュールを import しない
import { BONUS_YAKU, isNoYaku } from '../../core/no-yaku';
import type { Payment } from '../../core/payment';
import type { ScoredHora } from '../../core/result';

export { BONUS_YAKU, isNoYaku };

export type GlanceSide =
  | { by: 'ron' | 'tsumo'; kind: 'points'; text: string }
  | { by: 'ron' | 'tsumo'; kind: 'no-yaku' }
  | { by: 'ron' | 'tsumo'; kind: 'none' };

/** 3桁区切り。ロケールに依存しないよう手書き */
export const formatNumber = (n: number): string =>
  String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** ツモの支払いの区切り(UI 監修で変えるときはここだけ) */
export const TSUMO_SEPARATOR = '・';

/**
 * 打点。detail の各値に withHonba を使うかを選べる。
 * ロン: "2,600"
 * 子のツモ: "子・親"("1,000・2,000")
 * 親のツモ: "1,000オール"
 */
export const formatPoints = (payment: Payment, withHonba = false): string => {
  if (payment.detail.by === 'ron') {
    const val = withHonba
      ? payment.detail.discarder.withHonba
      : payment.detail.discarder.base;
    return formatNumber(val);
  }
  if (payment.detail.winner === 'dealer') {
    const val = withHonba
      ? payment.detail.eachNonDealer.withHonba
      : payment.detail.eachNonDealer.base;
    return `${formatNumber(val)}オール`;
  }
  const nonDealerVal = withHonba
    ? payment.detail.nonDealer.withHonba
    : payment.detail.nonDealer.base;
  const dealerVal = withHonba
    ? payment.detail.dealer.withHonba
    : payment.detail.dealer.base;
  // 子ツモでも2人の支払いが等しいとき(ロン打点折半・北家分折半など)は「オール」
  if (nonDealerVal === dealerVal) {
    return `${formatNumber(nonDealerVal)}オール`;
  }
  return `${formatNumber(nonDealerVal)}${TSUMO_SEPARATOR}${formatNumber(dealerVal)}`;
};

/** 各 by について isNoYaku でない候補のうち payment.total が最大の1件 */
export const pickBestByBy = (
  hora: ScoredHora[],
  by: 'ron' | 'tsumo'
): ScoredHora | null => {
  const candidates = hora.filter(h => h.by === by && !isNoYaku(h));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, cur) =>
    cur.score.payment.total > best.score.payment.total ? cur : best
  );
};

/** ロン → ツモの順に2要素。各 by について isNoYaku でない候補のうち payment.total が最大の1件 */
export const horaGlanceParts = (hora: ScoredHora[]): GlanceSide[] => {
  return (['ron', 'tsumo'] as const).map(by => {
    const hasCandidates = hora.some(h => h.by === by);
    if (!hasCandidates) {
      return { by, kind: 'none' };
    }
    const best = pickBestByBy(hora, by);
    if (!best) {
      return { by, kind: 'no-yaku' };
    }
    return { by, kind: 'points', text: formatPoints(best.score.payment) };
  });
};
