// 出典: livewing/mahjong-calc (src/components/FuDetail.tsx) を参考に作成
import type { Fu } from '../../../core/fu';
import type { Table } from '../../../core/table';
import type {
  Tile as CoreTile,
  TileCountsIndex,
  TileOrBack
} from '../../../core/tile';
import { fuRowName, headFuKey, kotsuFuKey } from './format';
import { FU_LABELS } from './labels';

export type BlockFu = Extract<Fu, { type: 'shuntsu' | 'kotsu' | 'head' }>;

export interface FuRow {
  name: string;
  fu: number;
  tiles?: TileOrBack[] | undefined;
}

/** TileCountsIndex (0〜33) を CoreTile に変換 (5は赤にしない) */
export const countsIndexToTile = (index: TileCountsIndex): CoreTile => {
  if (index >= 27) {
    const n = (index - 26) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    return { type: 'z', n };
  }
  const type = index >= 18 ? 's' : index >= 9 ? 'p' : 'm';
  const offset = index >= 18 ? 17 : index >= 9 ? 8 : -1;
  const n = (index - offset) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  if (n === 5) {
    return { type, n: 5, red: false };
  }
  return { type, n };
};

/** 符の生の合計 (sumOfFu を import せず同等の式で計算) */
export const sumRawFu = (fu: Fu[]): number => {
  return fu.reduce(
    (acc, f) => acc + f.fu + (f.type === 'waiting' ? f.block.fu : 0),
    0
  );
};

const blockToRow = (block: BlockFu, table?: Table): FuRow => {
  switch (block.type) {
    case 'shuntsu': {
      const t = block.tile;
      return {
        name: FU_LABELS.shuntsu,
        fu: block.fu,
        tiles: [
          countsIndexToTile(t),
          countsIndexToTile((t + 1) as TileCountsIndex),
          countsIndexToTile((t + 2) as TileCountsIndex)
        ]
      };
    }
    case 'kotsu': {
      const t = countsIndexToTile(block.tile);
      const key = kotsuFuKey(block.tile, block.kotsuType);
      let tiles: TileOrBack[];
      if (block.kotsuType === 'ankan') {
        tiles = [{ type: 'back' }, t, t, { type: 'back' }];
      } else if (block.kotsuType === 'minkan') {
        tiles = [t, t, t, t];
      } else {
        tiles = [t, t, t];
      }
      return {
        name: FU_LABELS[key],
        fu: block.fu,
        tiles
      };
    }
    case 'head': {
      const t = countsIndexToTile(block.tile);
      const key = headFuKey(block.tile, block.fu, table);
      return {
        name: FU_LABELS[key],
        fu: block.fu,
        tiles: [t, t]
      };
    }
  }
};

/** Fu[] から表示行を作成する */
export const fuRows = (
  fu: Fu[],
  table?: Table,
  horaType?: 'mentsu' | 'chitoitsu' | 'kokushi' | 'shisanputa'
): FuRow[] => {
  if (horaType === 'chitoitsu') {
    return [{ name: FU_LABELS.chitoitsu, fu: 25 }];
  }

  const rows: FuRow[] = [];
  for (const item of fu) {
    if (item.type === 'waiting') {
      // 2行に分ける: (1) block を上の規則で1行、(2) 待ちの名と waiting.fu
      rows.push(blockToRow(item.block, table));
      rows.push({
        name: FU_LABELS[item.waitingType],
        fu: item.fu
      });
    } else if (
      item.type === 'shuntsu' ||
      item.type === 'kotsu' ||
      item.type === 'head'
    ) {
      rows.push(blockToRow(item, table));
    } else {
      const { name } = fuRowName(item, table);
      rows.push({
        name,
        fu: item.fu
      });
    }
  }
  return rows;
};
