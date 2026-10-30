import type { HandOptions, Meld } from './input';
import type { Rule } from './rule';
import type { Table } from './table';
import {
  type Tile,
  type TileCounts,
  type TileCountsIndex,
  countsIndexToTile,
  tileCountsFirstIndex,
  tilesToCounts
} from './tile';
import { countKokushiShanten } from './tile/shanten';
import type { NormalYaku, Yakuman } from './yaku';

export interface Mentsu {
  type: 'kotsu' | 'shuntsu';
  tile: TileCountsIndex;
}

export interface MentsuLocalYakuContext {
  allMentsu: Mentsu[];
  head: TileCountsIndex;
  allTiles: Tile[];
  allTilesCounts: TileCounts;
  horaTile: Tile;
  melds: Meld[];
  menzen: boolean;
  table: Table;
  options: HandOptions;
  rule: Rule;
}

export interface MentsuLocalYakuResult {
  yakuman: { yakuman: Yakuman; ron: boolean; tsumo: boolean }[];
  yaku: { yaku: NormalYaku; ron: boolean; tsumo: boolean }[];
  removeIipeko: boolean;
  removeRyuiso: boolean;
}

/** 牌が推不倒の対象か (1234589p, 245689s, 白) */
const isToiputaoTile = (t: Tile): boolean => {
  if (t.type === 'p') {
    return (
      t.n === 1 ||
      t.n === 2 ||
      t.n === 3 ||
      t.n === 4 ||
      t.n === 5 ||
      t.n === 8 ||
      t.n === 9
    );
  }
  if (t.type === 's') {
    return (
      t.n === 2 || t.n === 4 || t.n === 5 || t.n === 6 || t.n === 8 || t.n === 9
    );
  }
  if (t.type === 'z') {
    return t.n === 5; // 白
  }
  return false;
};

/** 全牌に五門斉の5要素が含まれているか */
const isUumensai = (allTiles: Tile[]): boolean => {
  let hasM = false;
  let hasP = false;
  let hasS = false;
  let hasKaze = false;
  let hasSangen = false;

  for (const t of allTiles) {
    if (t.type === 'm') hasM = true;
    else if (t.type === 'p') hasP = true;
    else if (t.type === 's') hasS = true;
    else if (t.type === 'z') {
      if (t.n >= 1 && t.n <= 4) hasKaze = true;
      else if (t.n >= 5 && t.n <= 7) hasSangen = true;
    }
  }

  return hasM && hasP && hasS && hasKaze && hasSangen;
};

/** 全牌が 2p, 4p, 8p および東南西北のみか (黒一色) */
const isKokuiso = (allTiles: Tile[]): boolean => {
  return allTiles.every(
    t =>
      (t.type === 'p' && (t.n === 2 || t.n === 4 || t.n === 8)) ||
      (t.type === 'z' && t.n >= 1 && t.n <= 4)
  );
};

/** 全牌が 2〜8p 各2枚か (大車輪) */
const isDaisharin = (counts: TileCounts): boolean => {
  for (let i = 0; i < counts.length; i++) {
    const isTarget =
      i >= tileCountsFirstIndex.p + 1 && i <= tileCountsFirstIndex.p + 7;
    // biome-ignore lint/style/noNonNullAssertion: counts has fixed length 34
    if (isTarget ? counts[i]! !== 2 : counts[i]! !== 0) {
      return false;
    }
  }
  return true;
};

/** 全牌が 2〜8s 各2枚か (大竹林) */
const isDaichikurin = (counts: TileCounts): boolean => {
  for (let i = 0; i < counts.length; i++) {
    const isTarget =
      i >= tileCountsFirstIndex.s + 1 && i <= tileCountsFirstIndex.s + 7;
    // biome-ignore lint/style/noNonNullAssertion: counts has fixed length 34
    if (isTarget ? counts[i]! !== 2 : counts[i]! !== 0) {
      return false;
    }
  }
  return true;
};

/** 石の上にも三年が成立するか */
const isIshinoUe = (options: HandOptions): boolean => {
  const isDoubleRiichi =
    options.riichi === 'double-riichi' ||
    options.riichi === 'open-double-riichi';
  return (
    isDoubleRiichi &&
    options.haitei &&
    (isDoubleRiichi ? !options.ippatsu : true)
  );
};

/**
 * 面子手のローカル役を判定する (A6-L30 用に export)
 */
export const judgeMentsuLocalYaku = (
  ctx: MentsuLocalYakuContext
): MentsuLocalYakuResult => {
  if (!ctx.rule.localYaku) {
    return {
      yakuman: [],
      yaku: [],
      removeIipeko: false,
      removeRyuiso: false
    };
  }

  const yakuman: { yakuman: Yakuman; ron: boolean; tsumo: boolean }[] = [];
  const yaku: { yaku: NormalYaku; ron: boolean; tsumo: boolean }[] = [];
  let removeIipeko = false;
  let removeRyuiso = false;

  const { allMentsu, head, allTiles, allTilesCounts, melds, menzen, options } =
    ctx;

  const kotsuList = allMentsu.filter(m => m.type === 'kotsu');
  const shuntsuList = allMentsu.filter(m => m.type === 'shuntsu');

  // ---- 役満 ----

  // 四連刻: 同色で数字の連続する4刻子
  if (kotsuList.length === 4) {
    const tiles = kotsuList.map(m => countsIndexToTile(m.tile));
    const firstType = tiles[0]?.type;
    if (
      firstType &&
      firstType !== 'z' &&
      tiles.every(t => t.type === firstType)
    ) {
      const numbers = tiles.map(t => t.n).sort((a, b) => a - b);
      if (
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[1]! === numbers[0]! + 1 &&
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[2]! === numbers[0]! + 2 &&
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[3]! === numbers[0]! + 3
      ) {
        yakuman.push({
          yakuman: { type: 'yakuman', name: 'surenko', point: 1 },
          ron: true,
          tsumo: true
        });
      }
    }
  }

  // 一色四順: 同色同数の順子4組
  if (shuntsuList.length === 4) {
    const firstTile = shuntsuList[0]?.tile;
    if (shuntsuList.every(m => m.tile === firstTile)) {
      yakuman.push({
        yakuman: { type: 'yakuman', name: 'isshoku-yonjun', point: 1 },
        ron: true,
        tsumo: true
      });
    }
  }

  // 紅孔雀: 全牌が 1579s (赤5s含む) と 中 のみ
  if (
    allTiles.every(
      t =>
        (t.type === 's' &&
          (t.n === 1 || t.n === 5 || t.n === 7 || t.n === 9)) ||
        (t.type === 'z' && t.n === 7)
    )
  ) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'beni-kujaku', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 紅一点: 全牌が 23468s と 中 のみ、かつ中を含む
  const isGreenOnlyTile = (t: Tile) =>
    t.type === 's' &&
    (t.n === 2 || t.n === 3 || t.n === 4 || t.n === 6 || t.n === 8);
  if (
    allTiles.every(t => isGreenOnlyTile(t) || (t.type === 'z' && t.n === 7)) &&
    allTiles.some(t => t.type === 'z' && t.n === 7)
  ) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'koitten', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 黒一色: 全牌が 248p と 東南西北 のみ
  if (isKokuiso(allTiles)) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'kokuiso', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 大車輪: 全牌が 2〜8p 各2枚
  if (isDaisharin(allTilesCounts)) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'daisharin', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 大竹林: 全牌が 2〜8s 各2枚
  if (isDaichikurin(allTilesCounts)) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'daichikurin', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 石の上にも三年: ダブル立直かつ海底/河底 (門前)
  if (menzen && isIshinoUe(options)) {
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'ishino-ue', point: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 金門橋: 門前で、同色の順子 123・345・567・789 と任意の雀頭
  if (menzen && shuntsuList.length === 4) {
    const tiles = shuntsuList.map(m => countsIndexToTile(m.tile));
    const firstType = tiles[0]?.type;
    if (
      firstType &&
      firstType !== 'z' &&
      tiles.every(t => t.type === firstType)
    ) {
      const numbers = tiles.map(t => t.n).sort((a, b) => a - b);
      if (
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[0]! === 1 &&
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[1]! === 3 &&
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[2]! === 5 &&
        // biome-ignore lint/style/noNonNullAssertion:
        numbers[3]! === 7
      ) {
        yakuman.push({
          yakuman: { type: 'yakuman', name: 'kinmonkyo', point: 1 },
          ron: true,
          tsumo: true
        });
      }
    }
  }

  // 東北新幹線: 門前で、東と北の一方が刻子(暗槓含む)・他方が雀頭、残り3面子が同色の 123・456・789
  if (menzen && shuntsuList.length === 3 && kotsuList.length === 1) {
    const headTile = countsIndexToTile(head);
    // biome-ignore lint/style/noNonNullAssertion: kotsuList has 1 item
    const kotsuTile = countsIndexToTile(kotsuList[0]!.tile);

    const isEastNorthCombo =
      (headTile.type === 'z' &&
        headTile.n === 1 &&
        kotsuTile.type === 'z' &&
        kotsuTile.n === 4) ||
      (headTile.type === 'z' &&
        headTile.n === 4 &&
        kotsuTile.type === 'z' &&
        kotsuTile.n === 1);

    if (isEastNorthCombo) {
      const sTiles = shuntsuList.map(m => countsIndexToTile(m.tile));
      const sType = sTiles[0]?.type;
      if (sType && sType !== 'z' && sTiles.every(t => t.type === sType)) {
        const sNums = sTiles.map(t => t.n).sort((a, b) => a - b);
        if (
          // biome-ignore lint/style/noNonNullAssertion:
          sNums[0]! === 1 &&
          // biome-ignore lint/style/noNonNullAssertion:
          sNums[1]! === 4 &&
          // biome-ignore lint/style/noNonNullAssertion:
          sNums[2]! === 7
        ) {
          yakuman.push({
            yakuman: {
              type: 'yakuman',
              name: 'tohoku-shinkansen',
              point: 1
            },
            ron: true,
            tsumo: true
          });
        }
      }
    }
  }

  // 純正緑一色: 緑一色の条件を満たし、發を含まない (全牌が 23468s のみ)
  if (allTiles.every(isGreenOnlyTile)) {
    removeRyuiso = true;
    yakuman.push({
      yakuman: { type: 'yakuman', name: 'junsei-ryuiso', point: 2 },
      ron: true,
      tsumo: true
    });
  }

  // ---- 通常役 ----

  // 燕返し: 他家の立直宣言牌でロン
  if (options.tsubameGaeshi) {
    yaku.push({
      yaku: { type: 'yaku', name: 'tsubame-gaeshi', han: 1 },
      ron: true,
      tsumo: false
    });
  }

  // 槓振り: 他家の槓・北抜き直後の打牌でロン
  if (options.kanFuri) {
    yaku.push({
      yaku: { type: 'yaku', name: 'kan-furi', han: 1 },
      ron: true,
      tsumo: false
    });
  }

  // 推不倒: 全牌が 1234589p・245689s・白 のみ
  if (allTiles.every(isToiputaoTile)) {
    yaku.push({
      yaku: { type: 'yaku', name: 'toiputao', han: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 十二落抬: 副露4つかつ暗槓なし (裸単騎)
  if (melds.length === 4 && melds.every(m => !(m.type === 'kan' && m.closed))) {
    yaku.push({
      yaku: { type: 'yaku', name: 'shiiaru-raotai', han: 1 },
      ron: true,
      tsumo: true
    });
  }

  // 五門斉: 萬子・筒子・索子・風牌・三元牌がすべてある
  if (isUumensai(allTiles)) {
    yaku.push({
      yaku: { type: 'yaku', name: 'uumensai', han: 2 },
      ron: true,
      tsumo: true
    });
  }

  // 三連刻: 同色で数の連続する刻子3つ
  if (kotsuList.length >= 3) {
    const kotsuTiles = kotsuList.map(m => countsIndexToTile(m.tile));
    for (const suit of ['p', 's'] as const) {
      const nums = kotsuTiles
        .filter(t => t.type === suit)
        .map(t => t.n)
        .sort((a, b) => a - b);
      let found = false;
      for (let i = 0; i <= nums.length - 3; i++) {
        // biome-ignore lint/style/noNonNullAssertion:
        if (nums[i + 1]! === nums[i]! + 1 && nums[i + 2]! === nums[i]! + 2) {
          found = true;
          break;
        }
      }
      if (found) {
        yaku.push({
          yaku: { type: 'yaku', name: 'sanrenko', han: 2 },
          ron: true,
          tsumo: true
        });
        break;
      }
    }
  }

  // 一色三順: 同色同数の順子3組 (門前3飜・副露2飜)
  if (shuntsuList.length >= 3) {
    const countsMap = new Map<TileCountsIndex, number>();
    for (const m of shuntsuList) {
      countsMap.set(m.tile, (countsMap.get(m.tile) ?? 0) + 1);
    }
    let hasIsshokuSanjun = false;
    for (const count of countsMap.values()) {
      if (count >= 3) {
        hasIsshokuSanjun = true;
        break;
      }
    }
    if (hasIsshokuSanjun) {
      removeIipeko = true;
      yaku.push({
        yaku: {
          type: 'yaku',
          name: 'isshoku-sanjun',
          han: menzen ? 3 : 2
        },
        ron: true,
        tsumo: true
      });
    }
  }

  return {
    yakuman,
    yaku,
    removeIipeko,
    removeRyuiso
  };
};

/**
 * 七対子のローカル役を判定する
 */
export const judgeChitoitsuLocalYaku = (
  allTiles: Tile[],
  counts: TileCounts,
  options: HandOptions,
  rule: Rule
): {
  yakuman: Yakuman[];
  yaku: { yaku: NormalYaku; ron: boolean; tsumo: boolean }[];
  removeTsuiso: boolean;
} => {
  if (!rule.localYaku) {
    return { yakuman: [], yaku: [], removeTsuiso: false };
  }

  const yakuman: Yakuman[] = [];
  const yaku: { yaku: NormalYaku; ron: boolean; tsumo: boolean }[] = [];
  let removeTsuiso = false;

  // 大七星: 字牌7種の七対子 (字一色を置き換え)
  const isDaichisei =
    counts
      .slice(tileCountsFirstIndex.z, tileCountsFirstIndex.z + 7)
      .every(c => c === 2) &&
    counts.slice(0, tileCountsFirstIndex.z).every(c => c === 0);

  if (isDaichisei) {
    removeTsuiso = true;
    yakuman.push({ type: 'yakuman', name: 'daichisei', point: 2 });
  }

  // 黒一色
  if (isKokuiso(allTiles)) {
    yakuman.push({ type: 'yakuman', name: 'kokuiso', point: 1 });
  }

  // 大車輪
  if (isDaisharin(counts)) {
    yakuman.push({ type: 'yakuman', name: 'daisharin', point: 1 });
  }

  // 大竹林
  if (isDaichikurin(counts)) {
    yakuman.push({ type: 'yakuman', name: 'daichikurin', point: 1 });
  }

  // 石の上にも三年 (七対子は常に門前)
  if (isIshinoUe(options)) {
    yakuman.push({ type: 'yakuman', name: 'ishino-ue', point: 1 });
  }

  // ---- 通常役 ----
  if (options.tsubameGaeshi) {
    yaku.push({
      yaku: { type: 'yaku', name: 'tsubame-gaeshi', han: 1 },
      ron: true,
      tsumo: false
    });
  }

  if (options.kanFuri) {
    yaku.push({
      yaku: { type: 'yaku', name: 'kan-furi', han: 1 },
      ron: true,
      tsumo: false
    });
  }

  if (allTiles.every(isToiputaoTile)) {
    yaku.push({
      yaku: { type: 'yaku', name: 'toiputao', han: 1 },
      ron: true,
      tsumo: true
    });
  }

  if (isUumensai(allTiles)) {
    yaku.push({
      yaku: { type: 'yaku', name: 'uumensai', han: 2 },
      ron: true,
      tsumo: true
    });
  }

  return {
    yakuman,
    yaku,
    removeTsuiso
  };
};

/**
 * 国士無双のローカル役を判定する
 */
export const judgeKokushiLocalYaku = (
  options: HandOptions,
  rule: Rule
): { yakuman: Yakuman[] } => {
  if (!rule.localYaku) {
    return { yakuman: [] };
  }

  const yakuman: Yakuman[] = [];
  if (isIshinoUe(options)) {
    yakuman.push({ type: 'yakuman', name: 'ishino-ue', point: 1 });
  }
  return { yakuman };
};

/**
 * 14枚の牌姿が十三不搭の形を満たすか
 */
export const isShisanputa = (counts: TileCounts): boolean => {
  let pairCount = 0;
  let isolatedCount = 0;

  for (let i = 0; i < counts.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion:
    const c = counts[i]!;
    if (c >= 3) return false;
    if (c === 2) pairCount++;
    else if (c === 1) isolatedCount++;
  }

  // 14枚で、1種が2枚(対子)、12種が1枚
  if (pairCount !== 1 || isolatedCount !== 12) {
    return false;
  }

  // 各数牌スートで、隣り合う数字が3以上離れているか
  for (const suit of ['m', 'p', 's'] as const) {
    const firstIdx = tileCountsFirstIndex[suit];
    const nums: number[] = [];
    for (let n = 1; n <= 9; n++) {
      // biome-ignore lint/style/noNonNullAssertion:
      if (counts[firstIdx + n - 1]! > 0) {
        nums.push(n);
      }
    }
    for (let i = 0; i < nums.length - 1; i++) {
      // biome-ignore lint/style/noNonNullAssertion:
      if (nums[i + 1]! - nums[i]! < 3) {
        return false;
      }
    }
  }

  // 国士無双の形は除外する
  if (countKokushiShanten(counts) === 0) {
    return false;
  }

  return true;
};

/**
 * 十三不搭の和了を生成する
 */
export const generateShisanputaHora = (
  _table: Table,
  hand: Tile[],
  options: HandOptions,
  rule: Rule
): {
  type: 'shisanputa';
  by: 'tsumo';
  horaTile: Tile;
  yaku: Yakuman[];
}[] => {
  if (
    !rule.localYaku ||
    !options.tenho ||
    hand.length !== 13 ||
    countKokushiShanten(tilesToCounts(hand)) === 0
  ) {
    return [];
  }

  const handCounts = tilesToCounts(hand);

  // 三麻で有効な牌のインデックス (1m, 9m, 1-9p, 1-9s, 1-7z)
  const validIndices: TileCountsIndex[] = [
    tileCountsFirstIndex.m as TileCountsIndex,
    (tileCountsFirstIndex.m + 8) as TileCountsIndex,
    ...[...Array(9)].map(
      (_, i) => (tileCountsFirstIndex.p + i) as TileCountsIndex
    ),
    ...[...Array(9)].map(
      (_, i) => (tileCountsFirstIndex.s + i) as TileCountsIndex
    ),
    ...[...Array(7)].map(
      (_, i) => (tileCountsFirstIndex.z + i) as TileCountsIndex
    )
  ];

  const horas: {
    type: 'shisanputa';
    by: 'tsumo';
    horaTile: Tile;
    yaku: Yakuman[];
  }[] = [];

  for (const idx of validIndices) {
    // biome-ignore lint/style/noNonNullAssertion:
    if (handCounts[idx]! >= 4) continue;

    const counts14 = [...handCounts] as TileCounts;
    // biome-ignore lint/style/noNonNullAssertion:
    counts14[idx]! += 1;

    if (isShisanputa(counts14)) {
      const tile = countsIndexToTile(idx);
      horas.push({
        type: 'shisanputa',
        by: 'tsumo',
        horaTile: tile,
        yaku: [{ type: 'yakuman', name: 'shisanputa', point: 1 }]
      });
    }
  }

  return horas;
};
