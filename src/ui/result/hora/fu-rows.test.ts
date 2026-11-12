import { describe, expect, it } from 'vitest';
import type { Fu } from '../../../core/fu';
import type { HandOptions } from '../../../core/input';
import type { Table } from '../../../core/table';
import { fuRows, sumRawFu } from './fu-rows';

async function getCore() {
  const { generateResult } = await import('../../../core/result');
  const { DEFAULT_RULE } = await import('../../../core/rule');
  return { generateResult, DEFAULT_RULE };
}

describe('fu-rows.ts (E2 符の内訳行の組み立て)', () => {
  const defaultOptions: HandOptions = {
    riichi: 'none',
    ippatsu: false,
    rinshan: false,
    chankan: false,
    haitei: false,
    tenho: false,
    tsubameGaeshi: false,
    kanFuri: false
  };

  it('E2-12: fuRows - R24 ロンで行が順に 副底 20、門前ロン 10、順子 0 ×4、風牌/場風牌雀頭 2、単騎待ち 2', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };

    // R24: 123p456p234s789s1z + 1z (単騎待ち)
    const r24 = generateResult(
      southTable,
      {
        hand: [
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 2 },
          { type: 's', n: 3 },
          { type: 's', n: 4 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 'z', n: 1 },
          { type: 'z', n: 1 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      DEFAULT_RULE
    );

    expect(r24?.type).toBe('hora-shanten');
    if (r24?.type === 'hora-shanten' && r24.info.type === 'hora') {
      const ron = r24.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (!ron || ron.type !== 'mentsu') return;

      // table なしのとき: 風牌雀頭 2
      const rowsWithoutTable = fuRows(ron.fu);
      expect(rowsWithoutTable.map(r => ({ name: r.name, fu: r.fu }))).toEqual([
        { name: '副底', fu: 20 },
        { name: '門前ロン', fu: 10 },
        { name: '順子', fu: 0 },
        { name: '順子', fu: 0 },
        { name: '順子', fu: 0 },
        { name: '順子', fu: 0 },
        { name: '風牌雀頭', fu: 2 },
        { name: '単騎待ち', fu: 2 }
      ]);
      // 各順子は牌3枚(副底の次が門前ロンなので、順子は2〜5行目)
      expect(rowsWithoutTable[2]?.tiles).toHaveLength(3);
      expect(rowsWithoutTable[3]?.tiles).toHaveLength(3);
      expect(rowsWithoutTable[4]?.tiles).toHaveLength(3);
      expect(rowsWithoutTable[5]?.tiles).toHaveLength(3);
      // 雀頭は牌2枚
      expect(rowsWithoutTable[6]?.tiles).toHaveLength(2);
      // 待ちと副底・門前ロンは牌なし
      expect(rowsWithoutTable[0]?.tiles).toBeUndefined();
      expect(rowsWithoutTable[1]?.tiles).toBeUndefined();
      expect(rowsWithoutTable[7]?.tiles).toBeUndefined();

      // table あり (場風: 東): 場風牌雀頭 2
      const rowsWithTable = fuRows(ron.fu, southTable);
      expect(rowsWithTable[6]?.name).toBe('場風牌雀頭');
      expect(rowsWithTable[6]?.fu).toBe(2);
      expect(rowsWithTable[6]?.tiles).toHaveLength(2);
    }
  });

  it('E2-13: sumRawFu, fuRows - R19 ロンで么九牌暗刻 8 を含み、生の符の合計が 38 または 40', async () => {
    const { generateResult, DEFAULT_RULE } = await getCore();
    const southTable: Table = {
      round: 'east',
      seat: 'south',
      continue: 0,
      deposit: 0
    };
    const ruleYakuhai = { ...DEFAULT_RULE, north: 'yakuhai' as const };

    // R19: 444z123p456p789s9s + 9s (北=役牌)
    const r19 = generateResult(
      southTable,
      {
        hand: [
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'z', n: 4 },
          { type: 'p', n: 1 },
          { type: 'p', n: 2 },
          { type: 'p', n: 3 },
          { type: 'p', n: 4 },
          { type: 'p', n: 5, red: false },
          { type: 'p', n: 6 },
          { type: 's', n: 7 },
          { type: 's', n: 8 },
          { type: 's', n: 9 },
          { type: 's', n: 9 },
          { type: 's', n: 9 }
        ],
        melds: [],
        dora: [],
        nuki: 0
      },
      defaultOptions,
      ruleYakuhai
    );

    expect(r19?.type).toBe('hora-shanten');
    if (r19?.type === 'hora-shanten' && r19.info.type === 'hora') {
      const ron = r19.info.hora.find(h => h.by === 'ron');
      expect(ron).toBeDefined();
      if (!ron || ron.type !== 'mentsu') return;

      const rawTotal = sumRawFu(ron.fu);
      // 多面張で両面(38)と単騎(40)が同点。core の分解の順序が実行履歴で変わるため、どちらも許す
      expect([38, 40]).toContain(rawTotal);

      const rows = fuRows(ron.fu, southTable);
      const kotsuRow = rows.find(r => r.name === '么九牌暗刻');
      expect(kotsuRow).toBeDefined();
      expect(kotsuRow?.fu).toBe(8);
      expect(kotsuRow?.tiles).toHaveLength(3);
    }
  });

  it('E2-14: 暗槓の行は牌が4枚で両端が裏向きである', () => {
    // 暗槓の Fu
    const ankanFu: Fu = {
      type: 'kotsu',
      tile: 9, // 1p
      kotsuType: 'ankan',
      fu: 32
    };

    const rows = fuRows([ankanFu]);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row).toBeDefined();
    if (!row) return;
    expect(row.name).toBe('么九牌暗槓');
    expect(row.fu).toBe(32);
    expect(row.tiles).toEqual([
      { type: 'back' },
      { type: 'p', n: 1 },
      { type: 'p', n: 1 },
      { type: 'back' }
    ]);
  });

  it('E2-14: fuRows - 0符の行は muted(薄く)、平和ツモの行と 0 でない行は muted でない', () => {
    const rows = fuRows([
      { type: 'futei', fu: 20 },
      { type: 'pinfu-tsumo', fu: 0 },
      { type: 'shuntsu', tile: 9, fu: 0 },
      { type: 'tsumo', fu: 2 }
    ] as Fu[]);
    const byName = (name: string) => rows.find(r => r.name === name);
    expect(byName('副底')?.muted).toBeFalsy();
    expect(byName('平和ツモ')?.muted).toBe(false);
    expect(byName('順子')?.muted).toBe(true);
    expect(byName('ツモ')?.muted).toBeFalsy();
  });

  it('E2-15: fuRows - 待ちのブロックの和了牌の位置(winTileIndex)と、そのブロックの行は薄くしない', () => {
    // 2s3s4s の 2s で和了(両面)。順子 0符 だが、待ちを含むので muted でない
    const fu = [
      { type: 'futei', fu: 20 },
      { type: 'shuntsu', tile: 9, fu: 0 },
      {
        type: 'waiting',
        waitingType: 'ryanmen',
        block: { type: 'shuntsu', tile: 19, fu: 0 },
        fu: 0
      }
    ] as Fu[];
    const rows = fuRows(fu, undefined, 'mentsu', { type: 's', n: 2 });
    const waitBlock = rows.find(r => r.winTileIndex !== undefined);
    expect(waitBlock?.winTileIndex).toBe(0);
    expect(waitBlock?.muted).toBe(false);
    // ほかの順子(和了牌を含まない)は薄いまま
    expect(rows.find(r => r.name === '順子' && r !== waitBlock)?.muted).toBe(
      true
    );
    // 和了牌を渡さなければ、位置は付かない
    expect(
      fuRows(fu, undefined, 'mentsu').some(r => r.winTileIndex !== undefined)
    ).toBe(false);
  });
});
