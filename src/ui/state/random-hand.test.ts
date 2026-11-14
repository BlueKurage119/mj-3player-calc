import { describe, expect, it } from 'vitest';
import { type Tile, compareTiles, isAvailableTiles } from '../../core/tile';
import {
  type RandomFn,
  createWall,
  generateRandomHand,
  shuffleWith
} from './random-hand';

/** 決定論的な擬似乱数生成器(テスト用の線形合同法。[0, 1) を返す) */
function createSeededRandom(seed: number): RandomFn {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** 指定配列を順に返し、末尾に達したら最後の値を返し続ける乱数スタブ */
function createSequenceRandom(values: readonly number[]): RandomFn {
  let index = 0;
  return () => {
    const val = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return val;
  };
}

describe('F1-2: ランダム手牌生成の純関数', () => {
  it('F1-2-1: createWall(red) は108枚・2m〜8m なし・p/s の赤5が各 red 枚で先頭に並ぶ', () => {
    for (const red of [0, 1, 2] as const) {
      const wall = createWall(red);
      expect(wall).toHaveLength(108);
      expect(isAvailableTiles(red, [], wall)).toBe(true);

      // 2m〜8m を含まない
      expect(wall.filter(t => t.type === 'm' && t.n >= 2 && t.n <= 8)).toEqual(
        []
      );

      // 並び順の検証: 1m・9m → 1p〜9p → 1s〜9s → 1z〜7z
      expect(wall.slice(0, 8)).toEqual([
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 1 },
        { type: 'm', n: 9 },
        { type: 'm', n: 9 },
        { type: 'm', n: 9 },
        { type: 'm', n: 9 }
      ]);

      // 5p の並び(index: 8 + 4*4 = 24 から 4 枚)は赤が先
      const fiveP = wall.slice(24, 28);
      const expectedFiveP: Tile[] = Array.from({ length: 4 }, (_, i) => ({
        type: 'p',
        n: 5,
        red: i < red
      }));
      expect(fiveP).toEqual(expectedFiveP);

      // 5s の並び(index: 8 + 36 + 4*4 = 60 から 4 枚)は赤が先
      const fiveS = wall.slice(60, 64);
      const expectedFiveS: Tile[] = Array.from({ length: 4 }, (_, i) => ({
        type: 's',
        n: 5,
        red: i < red
      }));
      expect(fiveS).toEqual(expectedFiveS);

      // 5 以外の数牌と字牌は red プロパティを持たない
      const nonFiveTiles = wall.filter(t => t.type === 'z' || t.n !== 5);
      expect(nonFiveTiles.every(t => !('red' in t))).toBe(true);
    }
  });

  it('F1-2-2: createWall(red, "p") は36枚ですべて筒子、他スート指定も対応枚数を返す', () => {
    const wallP = createWall(1, 'p');
    expect(wallP).toHaveLength(36);
    expect(wallP.every(t => t.type === 'p')).toBe(true);
    expect(wallP.slice(16, 20)).toEqual([
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: false }
    ]);

    const wallS = createWall(2, 's');
    expect(wallS).toHaveLength(36);
    expect(wallS.every(t => t.type === 's')).toBe(true);
    expect(
      wallS.filter(t => t.type === 's' && t.n === 5 && t.red)
    ).toHaveLength(2);

    const wallM = createWall(2, 'm');
    expect(wallM).toHaveLength(8);
    expect(wallM.every(t => t.type === 'm' && (t.n === 1 || t.n === 9))).toBe(
      true
    );

    const wallZ = createWall(2, 'z');
    expect(wallZ).toHaveLength(28);
    expect(wallZ.every(t => t.type === 'z')).toBe(true);
  });

  it('F1-2-3: shuffleWith は元配列を変更せず降順 Fisher-Yates で入れ替える', () => {
    const input = [1, 2, 3, 4] as const;
    const copy = [...input];
    // i=3: j=floor(0.25*4)=1 -> [1,4,3,2]
    // i=2: j=floor(0.5*3)=1 -> [1,3,4,2]
    // i=1: j=floor(0*2)=0 -> [3,1,4,2]
    const result = shuffleWith(input, createSequenceRandom([0.25, 0.5, 0]));
    expect(input).toEqual(copy);
    expect(result).toEqual([3, 1, 4, 2]);
  });

  it('F1-2-4: generateRandomHand("random14") は複数の乱数列で常に14枚かつ isAvailableTiles を満たす', () => {
    for (const red of [0, 1, 2] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const hand = generateRandomHand(
          'random14',
          red,
          createSeededRandom(seed)
        );
        expect(hand).toHaveLength(14);
        expect(isAvailableTiles(red, [], hand)).toBe(true);
      }
    }
  });

  it('F1-2-5: generateRandomHand("chinitsu") は最初の乱数が <0.5 なら筒子、>=0.5 なら索子のみ14枚を返す', () => {
    // 最初が 0 (< 0.5) なら筒子、以降も 0 なら先頭固定で結果が一意になる
    const handP = generateRandomHand('chinitsu', 1, () => 0);
    expect(handP).toHaveLength(14);
    expect(handP.every(t => t.type === 'p')).toBe(true);
    expect(isAvailableTiles(1, [], handP)).toBe(true);

    // 0.499 (< 0.5) でも筒子
    const handPBoundary = generateRandomHand(
      'chinitsu',
      1,
      createSequenceRandom([0.499, 0])
    );
    expect(handPBoundary).toHaveLength(14);
    expect(handPBoundary.every(t => t.type === 'p')).toBe(true);

    // 最初が 0.5 (>= 0.5) なら索子
    const handS = generateRandomHand(
      'chinitsu',
      1,
      createSequenceRandom([0.5, 0])
    );
    expect(handS).toHaveLength(14);
    expect(handS.every(t => t.type === 's')).toBe(true);
    expect(isAvailableTiles(1, [], handS)).toBe(true);

    // 複数シードでも萬子・字牌を含まず、筒子のみか索子のみのどちらか
    for (let seed = 1; seed <= 30; seed++) {
      const hand = generateRandomHand('chinitsu', 2, createSeededRandom(seed));
      expect(hand).toHaveLength(14);
      expect(isAvailableTiles(2, [], hand)).toBe(true);
      const isAllP = hand.every(t => t.type === 'p');
      const isAllS = hand.every(t => t.type === 's');
      expect(isAllP || isAllS).toBe(true);
    }
  });

  it('F1-2-6: 末尾移動後は先頭13枚が compareTiles 順で整列済みで、全体整列が13枚+末尾の整列と一致する', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const hand = generateRandomHand('random14', 1, createSeededRandom(seed));
      const head13 = hand.slice(0, 13);
      const sortedHead13 = [...head13].sort(compareTiles);
      expect(head13).toEqual(sortedHead13);

      const sortedAll = [...hand].sort(compareTiles);
      const sortedRejoined = [...head13, hand[13] as Tile].sort(compareTiles);
      expect(sortedAll).toEqual(sortedRejoined);
    }

    // 固定乱数列で末尾移動の挙動を厳密に検証:
    // chinitsu, red=1: 最初 0(筒子), shuffle 35回すべて 0.9999(配列そのまま: 先頭14枚は 1p*4, 2p*4, 3p*4, 4p*2),
    // 最後 0(index 0 の 1p を末尾へ移動) -> 先頭13枚は 1p*3, 2p*4, 3p*4, 4p*2、末尾は 1p
    const seq = [0, ...Array<number>(35).fill(0.9999), 0];
    const handFixed = generateRandomHand(
      'chinitsu',
      1,
      createSequenceRandom(seq)
    );
    expect(handFixed).toEqual([
      { type: 'p', n: 1 },
      { type: 'p', n: 1 },
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 2 },
      { type: 'p', n: 2 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 3 },
      { type: 'p', n: 3 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 4 },
      { type: 'p', n: 1 }
    ]);
  });

  it('F1-2-7: 同じ乱数列を渡すと毎回同じ結果を返す(再現性)', () => {
    const hand1 = generateRandomHand('random14', 2, createSeededRandom(42));
    const hand2 = generateRandomHand('random14', 2, createSeededRandom(42));
    expect(hand1).toEqual(hand2);

    const chinitsu1 = generateRandomHand('chinitsu', 1, createSeededRandom(99));
    const chinitsu2 = generateRandomHand('chinitsu', 1, createSeededRandom(99));
    expect(chinitsu1).toEqual(chinitsu2);
  });
});
