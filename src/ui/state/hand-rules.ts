import { type Meld, instantiateMeld } from '../../core/input';
import type { Rule } from '../../core/rule';
import { type Tile, compareTiles, isAvailableTiles } from '../../core/tile';
import type { AppInput, AppState, TenkeySuit } from './app-state';

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

/**
 * テンキー入力バッファとスートから牌列を解決する。
 * buffer が空なら null。
 * suit === 'z': 全文字が 1〜7 なら { type: 'z', n } の列。0・8・9 を 1 つでも含めば null。
 * 数牌: '0' → { type: suit, n: 5, red: true }、'5' → { n: 5, red: false }、他は { n }。
 */
export const resolveTenkeyBuffer = (
  buffer: string,
  suit: TenkeySuit
): Tile[] | null => {
  if (buffer.length === 0) return null;
  if (suit === 'z') {
    const tiles: Tile[] = [];
    for (const char of buffer) {
      const n = Number(char);
      if (n >= 1 && n <= 7) {
        tiles.push({ type: 'z', n: n as 1 | 2 | 3 | 4 | 5 | 6 | 7 });
      } else {
        return null;
      }
    }
    return tiles;
  }

  const tiles: Tile[] = [];
  for (const char of buffer) {
    if (char === '0') {
      tiles.push({ type: suit, n: 5, red: true });
    } else if (char === '5') {
      tiles.push({ type: suit, n: 5, red: false });
    } else {
      const n = Number(char);
      if (n >= 1 && n <= 9) {
        tiles.push({
          type: suit,
          n: n as 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9
        });
      } else {
        return null;
      }
    }
  }
  return tiles;
};

/**
 * テンキー入力バッファに数字を追加できるか判定する。
 * /^[0-9]$/ でなければ偽。
 * hand.length + tenkeyBuffer.length >= maxHandLength(melds) なら偽(手牌+バッファが上限)。
 * tenkeyBuffer 内の digit の個数が 4 以上なら偽(同じ数字の 5 つ目)。
 */
export const canAppendTenkeyDigit = (
  state: Pick<AppState, 'input' | 'tenkeyBuffer'>,
  digit: string
): boolean => {
  if (!/^[0-9]$/.test(digit)) return false;
  if (
    state.input.hand.length + state.tenkeyBuffer.length >=
    maxHandLength(state.input.melds)
  ) {
    return false;
  }
  let count = 0;
  for (const char of state.tenkeyBuffer) {
    if (char === digit) count++;
  }
  if (count >= 4) return false;
  return true;
};

/**
 * 牌列を手牌に追加できるか判定する。
 * 先頭から 1 枚ずつ逐次判定し、全牌受け付けられるなら tiles (そのままの順) を返す。
 * 1 枚でも不可なら null。
 */
export const planAddTiles = (
  state: Pick<AppState, 'input' | 'rule'>,
  tiles: Tile[]
): Tile[] | null => {
  const currentHand = [...state.input.hand];
  for (const tile of tiles) {
    const nextState = {
      rule: state.rule,
      input: {
        ...state.input,
        hand: currentHand
      }
    };
    if (!canAddHandTile(nextState, tile)) {
      return null;
    }
    currentHand.push(tile);
  }
  return tiles;
};
