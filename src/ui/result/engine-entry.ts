// 確率・期待値の画面への入口(「計算」ボタン)を出す条件の純関数
// 初回 JS に含まれるため、遅延チャンクのモジュールを import しない
import type { ResultView } from './classify';

/** エンジンが扱う最大の向聴数(4向聴以上は計算しない) */
export const ENGINE_MAX_SHANTEN = 3;

/** 打牌候補1件の打牌後の向聴数(聴牌・和了は 0) */
const discardShanten = (
  d: Extract<ResultView, { kind: 'discard' }>['discards'][number]
): number =>
  d.next.type === 'tempai' || d.next.info.type === 'hora'
    ? 0
    : d.next.info.shanten;

/**
 * 入力が13枚か14枚か(副露分を除いた手牌の枚数。compute.ts の expected13 と同じ式)。
 * どちらでもない途中の入力は null
 */
export const engineHandSize = (
  handLength: number,
  meldCount: number
): 13 | 14 | null => {
  const expected13 = 13 - meldCount * 3;
  if (handLength === expected13) return 13;
  if (handLength === expected13 + 1) return 14;
  return null;
};

/**
 * 計算の開始向聴(13枚はその手の向聴、14枚は候補の最小向聴)。対象外は null。
 * 聴牌は 0。14枚の和了形・just-hora・none・4向聴以上は null
 */
export const engineStartShanten = (
  view: ResultView,
  handLength: number,
  meldCount: number
): number | null => {
  const size = engineHandSize(handLength, meldCount);
  if (size === null) return null;
  switch (view.kind) {
    case 'hora':
      return size === 13 && view.hora.length > 0 ? 0 : null;
    case 'tempai':
      return size === 13 && view.tileAvailabilities.some(a => a.count > 0)
        ? 0
        : null;
    case 'shanten':
      return size === 13 &&
        view.shanten >= 1 &&
        view.shanten <= ENGINE_MAX_SHANTEN
        ? view.shanten
        : null;
    case 'discard': {
      if (size !== 14 || view.discards.length === 0) return null;
      const min = Math.min(...view.discards.map(discardShanten));
      return min <= ENGINE_MAX_SHANTEN ? min : null;
    }
    default:
      return null;
  }
};

/** 「計算」ボタンを出すか */
export const isEngineEntryAvailable = (
  view: ResultView,
  handLength: number,
  meldCount: number
): boolean => engineStartShanten(view, handLength, meldCount) !== null;
