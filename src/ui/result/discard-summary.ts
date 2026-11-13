// 打牌候補の並び替え・待ち・打点レンジの計算用純関数
// 初回 JS に含まれるため、遅延チャンクのモジュールを import しない
import type { Discard, ScoredHora } from '../../core/result';
import type { Tile } from '../../core/tile';
import { formatNumber, pickBestByBy } from './hora-summary';

const TILE_TYPE_ORDER: Record<Tile['type'], number> = {
  m: 0,
  p: 1,
  s: 2,
  z: 3
};

const tileKey = (t: Tile): string =>
  `${t.type}${t.n}${t.type !== 'z' && t.n === 5 && t.red ? 'r' : ''}`;

/** core の compareTiles と同じ順(m < p < s < z、数の昇順、同じ数の五は通常 → 赤) */
export const compareTileOrder = (a: Tile, b: Tile): number => {
  if (a.type !== b.type) {
    return TILE_TYPE_ORDER[a.type] - TILE_TYPE_ORDER[b.type];
  }
  if (a.type !== 'z' && b.type !== 'z' && a.n === 5 && b.n === 5) {
    return (a.red ? 1 : 0) - (b.red ? 1 : 0);
  }
  return a.n - b.n;
};

/** 候補の次の状態。'shanten' は向聴、'tempai' は聴牌・和了(next.type==='tempai' か info.type==='hora') */
export type DiscardNextKind = 'shanten' | 'tempai';

export const discardNextKind = (d: Discard): DiscardNextKind =>
  d.next.type === 'tempai' || d.next.info.type === 'hora'
    ? 'tempai'
    : 'shanten';

/** 見出しとバッジの文字。先頭の候補で決める(全候補が同じ向聴数)。空なら null */
export const discardHeading = (discards: Discard[]): string | null => {
  const first = discards[0];
  if (!first) return null;
  if (first.next.type === 'tempai' || first.next.info.type === 'hora') {
    return '聴牌';
  }
  return `${first.next.info.shanten}向聴`;
};

const totalAcceptance = (d: Discard): number => {
  if (d.next.type !== 'hora-shanten' || d.next.info.type !== 'shanten') {
    return 0;
  }
  let total = 0;
  for (const a of d.next.info.tileAvailabilities) {
    if (a.count > 0) total += a.count;
  }
  return total;
};

/** 確定事項3の並び。全候補が向聴なら受け入れ枚数(count>0 の合計)降順・同数は compareTileOrder。そうでなければ入力の順のまま(新しい配列を返す) */
export const sortDiscards = (discards: Discard[]): Discard[] => {
  if (discards.length === 0) return [];
  const allShanten = discards.every(d => discardNextKind(d) === 'shanten');
  if (!allShanten) {
    return [...discards];
  }
  return [...discards].sort(
    (a, b) =>
      totalAcceptance(b) - totalAcceptance(a) ||
      compareTileOrder(a.tile, b.tile)
  );
};

/** 聴牌候補の待ち牌。hora は horaTile、tempai は count>0 の牌。compareTileOrder で並べ、同じ牌(赤五は別)を除く */
export const discardWaits = (d: Discard): Tile[] => {
  let raw: Tile[];
  if (d.next.type === 'tempai') {
    raw = d.next.tileAvailabilities.filter(a => a.count > 0).map(a => a.tile);
  } else if (d.next.info.type === 'hora') {
    raw = d.next.info.hora.map(h => h.horaTile);
  } else {
    return [];
  }
  const sorted = [...raw].sort(compareTileOrder);
  const unique: Tile[] = [];
  for (const t of sorted) {
    const prev = unique[unique.length - 1];
    if (!prev || compareTileOrder(prev, t) !== 0) {
      unique.push(t);
    }
  }
  return unique;
};

export type DiscardRange =
  | { kind: 'none' } // 待ちの和了が無い(hora が空、tempai 型)。レンジを出さない
  | { kind: 'no-yaku' } // すべての待ちでロン・ツモとも役なし
  | { kind: 'points'; min: number; max: number; hasNoYakuWait: boolean };

/** 確定事項5。hora: ScoredHora[] から集計する */
export const discardRange = (hora: ScoredHora[]): DiscardRange => {
  if (hora.length === 0) {
    return { kind: 'none' };
  }

  const byWait = new Map<string, ScoredHora[]>();
  for (const h of hora) {
    const key = tileKey(h.horaTile);
    const group = byWait.get(key);
    if (group) {
      group.push(h);
    } else {
      byWait.set(key, [h]);
    }
  }

  const totals: number[] = [];
  let hasNoYakuWait = false;

  for (const group of byWait.values()) {
    let waitHasYaku = false;
    for (const by of ['ron', 'tsumo'] as const) {
      const best = pickBestByBy(group, by);
      if (best) {
        totals.push(best.score.payment.total);
        waitHasYaku = true;
      }
    }
    if (!waitHasYaku) {
      hasNoYakuWait = true;
    }
  }

  if (totals.length === 0) {
    return { kind: 'no-yaku' };
  }

  return {
    kind: 'points',
    min: Math.min(...totals),
    max: Math.max(...totals),
    hasNoYakuWait
  };
};

/** 'none' → null、'no-yaku' → '役なし'、points → '（1,000〜2,000点）' / '（800点）' / '（役なし/1,000〜1,100点）' */
export const formatDiscardRange = (range: DiscardRange): string | null => {
  if (range.kind === 'none') return null;
  if (range.kind === 'no-yaku') return '役なし';
  const points =
    range.min === range.max
      ? `${formatNumber(range.min)}点`
      : `${formatNumber(range.min)}〜${formatNumber(range.max)}点`;
  const prefix = range.hasNoYakuWait ? '役なし/' : '';
  return `（${prefix}${points}）`;
};
