import { type Meld, instantiateMeld } from '../../core/input';
import type { Rule } from '../../core/rule';
import { type Tile, compareTiles, isAvailableTiles } from '../../core/tile';
import type { AppInput, AppState } from './app-state';

const NORTH_TILE: Tile = { type: 'z', n: 4 };

/** 手牌の最大枚数 (14 - 3 × 副露数) */
export const maxHandLength = (melds: Meld[]): number => 14 - 3 * melds.length;

/** 使用中の全牌 (手牌 + instantiateMeld(副露) + dora + uradora + 北×nuki) */
export const usedTiles = (input: AppInput, red: Rule['red']): Tile[] => {
  const meldTiles = input.melds.flatMap(meld => instantiateMeld(meld, red));
  const nukiTiles = Array.from({ length: input.nuki }, () => NORTH_TILE);
  return [
    ...input.hand,
    ...meldTiles,
    ...input.dora,
    ...input.uradora,
    ...nukiTiles
  ];
};

/** 手牌に指定の牌を追加できるか */
export const canAddHandTile = (
  state: Pick<AppState, 'input' | 'rule'>,
  tile: Tile
): boolean =>
  state.input.hand.length < maxHandLength(state.input.melds) &&
  isAvailableTiles(state.rule.red, usedTiles(state.input, state.rule.red), [
    tile
  ]);

/** 手牌が満杯か */
export const isHandFull = (input: AppInput): boolean =>
  input.hand.length >= maxHandLength(input.melds);

/**
 * 手牌を整列する。
 * hand.length === max なら先頭 max-1 枚を compareTiles で整列し末尾 1 枚を後ろに残す。
 * そうでなければ全体を整列する。
 */
export const sortHand = (hand: Tile[], max: number): Tile[] => {
  if (hand.length === max && max > 0) {
    const body = hand.slice(0, max - 1).sort(compareTiles);
    const winning = hand[max - 1];
    return winning !== undefined ? [...body, winning] : body;
  }
  return [...hand].sort(compareTiles);
};

/**
 * 表示用に手牌を本体と和了牌に分け、本体を整列して元の hand の index と共に返す。
 */
export const splitWinningTile = (
  hand: Tile[],
  max: number
): {
  body: { tile: Tile; index: number }[];
  winning: { tile: Tile; index: number } | null;
} => {
  const indexed = hand.map((tile, index) => ({ tile, index }));
  if (hand.length === max && max > 0) {
    const body = indexed
      .slice(0, max - 1)
      .sort((a, b) => compareTiles(a.tile, b.tile));
    const winning = indexed[max - 1] ?? null;
    return { body, winning };
  }
  return {
    body: indexed.sort((a, b) => compareTiles(a.tile, b.tile)),
    winning: null
  };
};
