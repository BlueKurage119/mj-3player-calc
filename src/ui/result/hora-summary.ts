// 和了の要約・役なし判定・バナー用純関数
// 初回 JS に含まれるため、遅延チャンクのモジュールを import しない
import type { Payment } from '../../core/payment';
import type { ScoredHora } from '../../core/result';

/** 懸賞役(1飜縛りに含めない役)。表示用の表ではなく判定の定義 */
export const BONUS_YAKU = ['dora', 'red-dora', 'nuki-dora', 'ippatsu'] as const;

/** 役満がなく、通常役が懸賞役だけ(空を含む)なら true */
export const isNoYaku = (hora: ScoredHora): boolean => {
  if (hora.score.yakumanPoint > 0) return false;
  return hora.yaku.every(
    y => y.type === 'yaku' && (BONUS_YAKU as readonly string[]).includes(y.name)
  );
};

export type GlanceSide =
  | { by: 'ron' | 'tsumo'; kind: 'points'; text: string }
  | { by: 'ron' | 'tsumo'; kind: 'no-yaku' }
  | { by: 'ron' | 'tsumo'; kind: 'none' };

/**
 * 本場抜きの打点。
 * ロン: "2600"
 * 子のツモ: "子·親"("1000·2000")
 * 親のツモ: "700オール"
 */
export const formatPoints = (payment: Payment): string => {
  if (payment.detail.by === 'ron') {
    return String(payment.detail.discarder.base);
  }
  if (payment.detail.winner === 'dealer') {
    return `${payment.detail.eachNonDealer.base}オール`;
  }
  return `${payment.detail.nonDealer.base}·${payment.detail.dealer.base}`;
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
