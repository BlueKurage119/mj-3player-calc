import { type Rule, redCountOf } from '../../core/rule';
import { type Tile, compareTiles } from '../../core/tile';

/** [0, 1) を返す乱数関数(Math.random 互換) */
export type RandomFn = () => number;

/** ランダム生成の種別 */
export type RandomHandKind = 'random14' | 'chinitsu';

type WallSuit = 'm' | 'p' | 's' | 'z';

const SUIT_NUMBERS: Record<WallSuit, readonly number[]> = {
  m: [1, 9],
  p: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  s: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  z: [1, 2, 3, 4, 5, 6, 7]
};

const ALL_SUITS: readonly WallSuit[] = ['m', 'p', 's', 'z'];

function createSuitTiles(suit: WallSuit, red: Rule['red']): Tile[] {
  const tiles: Tile[] = [];
  const redCount = redCountOf(red, suit);
  for (const n of SUIT_NUMBERS[suit]) {
    if (suit !== 'z' && n === 5) {
      for (let i = 0; i < 4; i++) {
        tiles.push({ type: suit, n: 5, red: i < redCount });
      }
    } else {
      for (let i = 0; i < 4; i++) {
        tiles.push({ type: suit, n } as Tile);
      }
    }
  }
  return tiles;
}

/** 三麻の全牌山(108枚)。type を指定するとその種類だけ(p・s は36枚) */
export function createWall(red: Rule['red'], type?: WallSuit): Tile[] {
  if (type !== undefined) {
    return createSuitTiles(type, red);
  }
  const wall: Tile[] = [];
  for (const suit of ALL_SUITS) {
    wall.push(...createSuitTiles(suit, red));
  }
  return wall;
}

/** Fisher–Yates。random を注入できる版(引数の配列は変更しない) */
export function shuffleWith<T>(a: readonly T[], random: RandomFn): T[] {
  const ret = [...a];
  for (let i = ret.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ret[i], ret[j]] = [ret[j] as T, ret[i] as T];
  }
  return ret;
}

/** 14枚を返す。整列後、ランダムな1枚を末尾へ移した並び */
export function generateRandomHand(
  kind: RandomHandKind,
  red: Rule['red'],
  random: RandomFn
): Tile[] {
  const wall =
    kind === 'chinitsu'
      ? createWall(red, random() < 0.5 ? 'p' : 's')
      : createWall(red);
  const hand = shuffleWith(wall, random).slice(0, 14).sort(compareTiles);
  const lastIndex = Math.floor(random() * hand.length);
  const [lastTile] = hand.splice(lastIndex, 1);
  if (lastTile !== undefined) {
    hand.push(lastTile);
  }
  return hand;
}
