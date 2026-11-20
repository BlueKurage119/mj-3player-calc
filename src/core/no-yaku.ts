// 役なし判定(1飜縛り: 役満がなく、通常役が懸賞役だけなら役なし)
import type { ScoredHora } from './result';

/** 懸賞役(1飜縛りに含めない役)。表示用の表ではなく判定の定義 */
export const BONUS_YAKU = [
  'dora',
  'ura-dora',
  'red-dora',
  'nuki-dora',
  'ippatsu'
] as const;

/** 役満がなく、通常役が懸賞役だけ(空を含む)なら true */
export const isNoYaku = (hora: ScoredHora): boolean => {
  if (hora.score.yakumanPoint > 0) return false;
  return hora.yaku.every(
    y => y.type === 'yaku' && (BONUS_YAKU as readonly string[]).includes(y.name)
  );
};
