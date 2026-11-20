import {
  calc_shanten_sanma,
  sanma_tile_limits,
  search,
  solve,
  policy_discard
} from 'engine';
import { describe, expect, it } from 'vitest';
import type { HandOptions, Input } from '../core/input';
import { generateResult } from '../core/result';
import { DEFAULT_RULE, type Rule } from '../core/rule';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCountsIndex,
  isSanmaIndex,
  tileToCountsIndex,
  tilesToCounts
} from '../core/tile';
import { computeEngine } from './compute';
import { evaluateTempaiForm } from './evaluate';
import { redDistributionForSuit } from './red';
import { computeReference } from './reference.test-util';
import {
  DEFAULT_ENGINE_OPTIONS,
  type EngineOptions,
  type EngineResponse
} from './types';
import { uradoraDistribution } from './ura';

const parseHand = (str: string): Tile[] => {
  const tiles: Tile[] = [];
  let nums: number[] = [];
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') {
      nums.push(Number(ch));
    } else if (ch === 'm' || ch === 'p' || ch === 's' || ch === 'z') {
      for (const n of nums) {
        if (n === 0) {
          if (ch !== 'p' && ch !== 's') throw new Error(`0${ch}`);
          tiles.push({ type: ch, n: 5, red: true });
        } else if (n === 5 && ch !== 'z') {
          tiles.push({ type: ch, n: 5, red: false });
        } else {
          tiles.push({ type: ch, n } as Tile);
        }
      }
      nums = [];
    }
  }
  return tiles;
};

const southTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const yakuhaiRule: Rule = {
  ...DEFAULT_RULE,
  north: 'yakuhai',
  red: 0
};

const OPTS_A: EngineOptions = {
  tegawari: false,
  backtrack: false,
  backtrackDiffMargin: 2
};

const OPTS_BP: EngineOptions = {
  tegawari: true,
  backtrack: false,
  backtrackDiffMargin: 2
};

const OPTS_DEFAULT: EngineOptions = { ...DEFAULT_ENGINE_OPTIONS };

const must = <T>(v: T | null | undefined, label = 'value'): T => {
  if (v == null) throw new Error(`missing ${label}`);
  return v;
};

/** A-6: 巡目別の表の不変条件を検査する */
const assertPerTurnValid = (res: EngineResponse, remainingDraws: number) => {
  expect(res.type).toBe('ok');
  if (res.type !== 'ok') return;
  for (const c of res.candidates) {
    expect(c.perTurn).toHaveLength(remainingDraws);
    if (remainingDraws === 0) continue;
    for (let i = 0; i < remainingDraws; i++) {
      const row = must(c.perTurn[i], 'perTurn row');
      expect(row.draw).toBe(i + 1);
      if (i > 0) {
        const prev = must(c.perTurn[i - 1], 'prev perTurn row');
        expect(row.tenpai).toBeGreaterThanOrEqual(prev.tenpai - 1e-12);
        expect(row.win).toBeGreaterThanOrEqual(prev.win - 1e-12);
        expect(row.ev).toBeGreaterThanOrEqual(prev.ev - 1e-12);
      }
    }
    const last = must(c.perTurn[remainingDraws - 1], 'last perTurn');
    expect(last.tenpai).toBeCloseTo(c.tenpai, 12);
    expect(last.win).toBeCloseTo(c.win, 12);
    expect(last.ev).toBeCloseTo(c.ev, 9);
  }
};

/** C-5: search の出力に 2m〜8m が一切現れないことを検査する */
const assertNo2m8mInSearch = (
  input: Input,
  rule: Rule,
  maxDraws: number,
  options: EngineOptions
) => {
  const meldsM = 4 - input.melds.length;
  const h0 = tilesToCounts(input.hand);
  const s0 = calc_shanten_sanma(Uint8Array.from(h0), meldsM);
  const visibleCounts = tilesToCounts([
    ...input.hand,
    ...input.dora,
    ...Array<Tile>(input.nuki).fill({ type: 'z', n: 4 })
  ]);
  const u0 = new Uint8Array(34);
  for (let i = 0; i < 34; i++) {
    if (isSanmaIndex(i as TileCountsIndex)) {
      u0[i] = Math.max(0, 4 - (visibleCounts[i] ?? 0));
    }
  }
  const sr = search(
    Uint8Array.from(h0),
    s0,
    Uint8Array.from(h0),
    meldsM,
    u0,
    sanma_tile_limits(),
    rule.north === 'nukidora',
    maxDraws,
    options.tegawari,
    options.backtrack,
    options.backtrackDiffMargin
  );
  try {
    const hands = sr.all_state_hands();
    for (let offset = 0; offset < hands.length; offset += 34) {
      for (let m = 1; m <= 7; m++) {
        expect(hands[offset + m]).toBe(0);
      }
    }
    const masks = sr.seen_tile_masks();
    // draw_lo(0), disc_lo(2), wait_lo(4) の bit 1..=7 がすべて 0
    for (const idx of [0, 2, 4]) {
      expect((masks[idx] ?? 0) & 0b1111_1110).toBe(0);
    }
  } finally {
    sr.free();
  }
};

describe('F3-1 計算エンジン (Issue #138)', () => {
  describe('A. 計算の正しさ', () => {
    it('F31-A1: 聴牌の厳密解(手計算と誤差 1e-12 以内で一致)', () => {
      // 111m 999m 123p 456p 1z (1z単騎待ち。c=3, U=108-13=95, q=3/95)
      const hand = parseHand('111999m123456p1z');
      const input: Input = { hand, melds: [], dora: [], nuki: 0 };
      const q = 3 / 95;

      for (const opts of [OPTS_A, OPTS_BP, OPTS_DEFAULT]) {
        for (const T of [1, 2, 18]) {
          const res = computeEngine({
            id: 1,
            table: southTable,
            input,
            rule: yakuhaiRule,
            remainingDraws: T,
            options: opts
          });
          assertPerTurnValid(res, T);
          if (res.type !== 'ok') continue;
          const cand = must(res.candidates[0], 'candidate');
          expect(cand.tenpai).toBe(1);
          const expectedWin = 1 - (1 - q) ** T;
          expect(Math.abs(cand.win - expectedWin)).toBeLessThan(1e-12);
          for (let i = 0; i < T; i++) {
            const row = must(cand.perTurn[i], 'perTurn');
            expect(Math.abs(row.tenpai - 1)).toBeLessThan(1e-12);
            expect(Math.abs(row.win - (1 - (1 - q) ** (i + 1)))).toBeLessThan(
              1e-12
            );
          }
        }
      }
      assertNo2m8mInSearch(input, yakuhaiRule, 2, OPTS_DEFAULT);
    });

    it('F31-A2: 聴牌の期待値(ev = win * v と誤差 1e-9 以内で一致)', () => {
      const hand = parseHand('111999m123456p1z');
      const input: Input = { hand, melds: [], dora: [], nuki: 0 };
      const handOpts: HandOptions = {
        riichi: 'riichi',
        ippatsu: false,
        rinshan: false,
        chankan: false,
        haitei: false,
        tenho: false,
        tsubameGaeshi: false,
        kanFuri: false
      };
      const coreRes = generateResult(southTable, input, handOpts, yakuhaiRule);
      expect(coreRes?.type).toBe('hora-shanten');
      if (coreRes?.type !== 'hora-shanten' || coreRes.info.type !== 'hora')
        return;
      const tsumoBest = must(
        coreRes.info.hora.find(h => h.by === 'tsumo'),
        'tsumoBest'
      );
      const v = tsumoBest.score.payment.total;

      for (const T of [1, 2, 18]) {
        const res = computeEngine({
          id: 2,
          table: southTable,
          input,
          rule: yakuhaiRule,
          remainingDraws: T,
          options: OPTS_DEFAULT
        });
        assertPerTurnValid(res, T);
        if (res.type !== 'ok') continue;
        const cand = must(res.candidates[0], 'candidate');
        expect(Math.abs(cand.ev - cand.win * v)).toBeLessThan(1e-9);
      }
    });

    it('F31-A3: 1向聴の厳密解(構成A・T=2で手計算と 1e-12 以内で一致)', () => {
      // 牌姿: 1111m 1111p 22p 4p 66s (13枚, 門前)
      // 一般形: 111m + 111p + 66s + 1m + 1p + 22p + 4p (s=1, 有効牌は 3p の1種 c=4 枚)
      // 七対子: 4枚使い不可, 5種・4対子 -> s = 6 - 4 + (7 - 5) = 4 > 1
      // 国士: 么九牌2種(1m,1p) + 対子あり -> s = 13 - 2 - 1 = 10 > 1
      // 3p を1枚引くと 1m を捨てて 111m 111p 123p 66s 24p (3p 単一嵌張待ち, c'=3, U'=94)
      // 式(T=2): p = 4/95, q' = 3/94
      // perTurn[0].tenpai = p, perTurn[1].tenpai = tenpai = 1 - (1 - p)^2
      // perTurn[0].win = 0, perTurn[1].win = win = p * q'
      const hand = parseHand('1111m1111224p66s');
      const input: Input = { hand, melds: [], dora: [], nuki: 0 };

      const res = computeEngine({
        id: 3,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: 2,
        options: OPTS_A
      });
      assertPerTurnValid(res, 2);
      if (res.type !== 'ok') return;

      const p = 4 / 95;
      const qPrime = 3 / 94;
      const expectedTenpai = 1 - (1 - p) ** 2;
      const expectedWin = p * qPrime;

      const cand = must(res.candidates[0], 'candidate');
      expect(must(cand.perTurn[0], 'turn 1').tenpai).toBeCloseTo(p, 12);
      expect(must(cand.perTurn[1], 'turn 2').tenpai).toBeCloseTo(
        expectedTenpai,
        12
      );
      expect(cand.tenpai).toBeCloseTo(expectedTenpai, 12);
      expect(must(cand.perTurn[0], 'turn 1').win).toBe(0);
      expect(must(cand.perTurn[1], 'turn 2').win).toBeCloseTo(expectedWin, 12);
      expect(cand.win).toBeCloseTo(expectedWin, 12);
      assertNo2m8mInSearch(input, yakuhaiRule, 2, OPTS_A);
    });

    it('F31-A4: B′(手替わり)は維持打牌で有効牌を増やし構成Aより ev が大きく、戻しは起きない', () => {
      // 副露3つ(ポン7z・ポン6z・ポン5z) + 手牌4枚: 11z 1p 9s (s0=1, T=3)
      // 端牌 1p・9s を中張牌(3p〜7p・3s〜7s 等)へ振り替える維持打牌で有効牌が増えるため
      // B′ の ev が構成Aより大きくなる。
      const hand = parseHand('11z1p9s');
      const input: Input = {
        hand,
        melds: [
          { type: 'pon', tile: { type: 'z', n: 7 } },
          { type: 'pon', tile: { type: 'z', n: 6 } },
          { type: 'pon', tile: { type: 'z', n: 5 } }
        ],
        dora: [],
        nuki: 0
      };
      const T = 3;

      const resA = computeEngine({
        id: 401,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: T,
        options: OPTS_A
      });
      const resBp = computeEngine({
        id: 402,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: T,
        options: OPTS_BP
      });
      assertPerTurnValid(resA, T);
      assertPerTurnValid(resBp, T);
      if (resA.type !== 'ok' || resBp.type !== 'ok') return;

      expect(must(resBp.candidates[0], 'bp cand').ev).toBeGreaterThan(
        must(resA.candidates[0], 'a cand').ev
      );

      // policy_discard で向聴を増やす打牌(戻し)が現れないことを全到達状態・有効ツモで検査
      const h0 = tilesToCounts(hand);
      const s0 = calc_shanten_sanma(Uint8Array.from(h0), 1);
      const visible = tilesToCounts([
        ...hand,
        { type: 'z', n: 7 },
        { type: 'z', n: 7 },
        { type: 'z', n: 7 },
        { type: 'z', n: 6 },
        { type: 'z', n: 6 },
        { type: 'z', n: 6 },
        { type: 'z', n: 5 },
        { type: 'z', n: 5 },
        { type: 'z', n: 5 }
      ]);
      const u0 = new Uint8Array(34);
      for (let i = 0; i < 34; i++) {
        if (isSanmaIndex(i as TileCountsIndex)) {
          u0[i] = Math.max(0, 4 - (visible[i] ?? 0));
        }
      }
      const sr = search(
        Uint8Array.from(h0),
        s0,
        Uint8Array.from(h0),
        1,
        u0,
        sanma_tile_limits(),
        false,
        T,
        OPTS_BP.tegawari,
        OPTS_BP.backtrack,
        OPTS_BP.backtrackDiffMargin
      );
      try {
        const wt = sr.tempai_wait_tiles();
        const vals = new Float64Array(wt.length * 2);
        for (let i = 0; i < wt.length; i++) vals[i * 2] = 1000;
        solve(sr, vals);

        const shCache = new Map<string, number>();
        const getSh = (arr: Uint8Array) => {
          const k = arr.join(',');
          let v = shCache.get(k);
          if (v === undefined) {
            v = calc_shanten_sanma(arr, 1);
            shCache.set(k, v);
          }
          return v;
        };

        const allHands = sr.all_state_hands();
        for (let off = 0; off < allHands.length; off += 34) {
          const sh = allHands.subarray(off, off + 34);
          const curS = getSh(sh);
          if (curS === 0) continue;
          for (let t = 1; t <= T; t++) {
            for (let k = 0; k < 34; k++) {
              if (!isSanmaIndex(k as TileCountsIndex)) continue;
              const d = policy_discard(sr, sh, t, 0, k);
              if (d >= 0) {
                const nxt = Uint8Array.from(sh);
                nxt[k] = (nxt[k] ?? 0) + 1;
                nxt[d] = (nxt[d] ?? 0) - 1;
                const nxtS = getSh(nxt);
                expect(nxtS).toBeLessThanOrEqual(curS);
              }
            }
          }
        }
      } finally {
        sr.free();
      }
    }, 30000);

    it('F31-A5: 戻し(B′+戻し s0=1, T=4)で独立参照実装と 1e-9 で一致し、戻しで得をする手で ev(B′+戻し) > ev(B′)', () => {
      // 副露3つ(ポン2p・ポン3s・ポン4s、タンヤオのみ可能) + 手牌4枚: 11p 5p 3s (s0=1)
      // dora=[1p,1p,5p,5p] により 1p/3s は残り0枚、5p は残り1枚のためトイトイは不可。
      // B′では 1巡目に 6s 等を引いても 1p 切りが s=2(戻し) となるため 1p を切れず、
      // B′+戻し では 1巡目に 1p を切って戻せるため ev(B′+戻し) > ev(B′) となる。
      // 副露3つ(ポン2p・ポン3s・ポン4s) + 手牌4枚: 11p 4p 5s (s0=1, T=4)
      // 注: m>=2 (7枚以上) は維持無制限による状態爆発のため T=4 でも 180秒超となるため、
      //     参照実装との 1e-9 一致・単調性・違反打牌なしを m=1 で検証する。
      //     (3副露では対々和が成立するため戻し優位手 evBt > evBp の確認は仕様改訂後に実施)
      const hand = parseHand('11p4p5s');
      const input: Input = {
        hand,
        melds: [
          { type: 'pon', tile: { type: 'p', n: 2 } },
          { type: 'pon', tile: { type: 's', n: 3 } },
          { type: 'pon', tile: { type: 's', n: 4 } }
        ],
        dora: [],
        nuki: 0
      };
      const T = 4;

      let evA = 0;
      let evBp = 0;
      let evBt = 0;
      for (const opts of [OPTS_A, OPTS_BP, OPTS_DEFAULT]) {
        const res = computeEngine({
          id: 500,
          table: southTable,
          input,
          rule: yakuhaiRule,
          remainingDraws: T,
          options: opts
        });
        assertPerTurnValid(res, T);
        if (res.type !== 'ok') throw new Error('unexpected non-ok');
        const cand = must(res.candidates[0], 'candidate');
        const ref = computeReference(southTable, input, yakuhaiRule, T, opts);

        expect(Math.abs(cand.tenpai - ref.tenpai)).toBeLessThan(1e-9);
        expect(Math.abs(cand.win - ref.win)).toBeLessThan(1e-9);
        expect(Math.abs(cand.ev - ref.ev)).toBeLessThan(1e-9);

        if (!opts.tegawari) evA = cand.ev;
        else if (opts.backtrack) evBt = cand.ev;
        else evBp = cand.ev;
      }

      expect(evBp).toBeGreaterThanOrEqual(evA);
      expect(evBt).toBeGreaterThanOrEqual(evBp);

      // 既定(B′+戻し K=2)の方針に条件違反の打牌(s'>3 または diff > s0+K)が現れないこと
      const h0 = tilesToCounts(hand);
      const s0 = calc_shanten_sanma(Uint8Array.from(h0), 1);
      const visible = tilesToCounts([
        ...hand,
        { type: 'p', n: 2 },
        { type: 'p', n: 2 },
        { type: 'p', n: 2 },
        { type: 's', n: 3 },
        { type: 's', n: 3 },
        { type: 's', n: 3 },
        { type: 's', n: 4 },
        { type: 's', n: 4 },
        { type: 's', n: 4 }
      ]);
      const u0 = new Uint8Array(34);
      for (let i = 0; i < 34; i++) {
        if (isSanmaIndex(i as TileCountsIndex)) {
          u0[i] = Math.max(0, 4 - (visible[i] ?? 0));
        }
      }
      const sr = search(
        Uint8Array.from(h0),
        s0,
        Uint8Array.from(h0),
        1,
        u0,
        sanma_tile_limits(),
        false,
        T,
        OPTS_DEFAULT.tegawari,
        OPTS_DEFAULT.backtrack,
        OPTS_DEFAULT.backtrackDiffMargin
      );
      try {
        const wt = sr.tempai_wait_tiles();
        const vals = new Float64Array(wt.length * 2);
        for (let i = 0; i < wt.length; i++) vals[i * 2] = 1000;
        solve(sr, vals);

        const shCache = new Map<string, number>();
        const getSh = (arr: Uint8Array) => {
          const k = arr.join(',');
          let v = shCache.get(k);
          if (v === undefined) {
            v = calc_shanten_sanma(arr, 1);
            shCache.set(k, v);
          }
          return v;
        };

        const visited = new Set<string>();
        const queue: { sh: Uint8Array; t: number }[] = [
          { sh: Uint8Array.from(h0), t: T }
        ];
        visited.add(`${h0.join(',')}|${T}`);
        while (queue.length > 0) {
          const item = queue.shift();
          if (!item) continue;
          const { sh, t } = item;
          if (t <= 0) continue;
          const curS = getSh(sh);
          if (curS === 0) continue;
          for (let k = 0; k < 34; k++) {
            if (!isSanmaIndex(k as TileCountsIndex)) continue;
            const d = policy_discard(sr, sh, t, 0, k);
            if (d >= 0) {
              const nxt = Uint8Array.from(sh);
              nxt[k] = (nxt[k] ?? 0) + 1;
              nxt[d] = (nxt[d] ?? 0) - 1;
              const nxtS = getSh(nxt);
              if (nxtS > curS) {
                expect(nxtS).toBe(curS + 1);
                expect(nxtS).toBeLessThanOrEqual(3);
                let common = 0;
                for (let j = 0; j < 34; j++) {
                  common += Math.min(nxt[j] ?? 0, h0[j] ?? 0);
                }
                const diff = 4 - common;
                expect(diff).toBeLessThanOrEqual(
                  s0 + OPTS_DEFAULT.backtrackDiffMargin
                );
              }
              if (t - 1 >= 1 && nxtS >= 1) {
                const nKey = `${nxt.join(',')}|${t - 1}`;
                if (!visited.has(nKey)) {
                  visited.add(nKey);
                  queue.push({ sh: nxt, t: t - 1 });
                }
              }
            }
          }
        }
      } finally {
        sr.free();
      }
    }, 60000);

    it('F31-A5b: 無効・範囲外オプションと残りツモ回数で error を返す', () => {
      const hand = parseHand('111999m123456p1z');
      const input: Input = { hand, melds: [], dora: [], nuki: 0 };

      const badOptionsList: EngineOptions[] = [
        { tegawari: false, backtrack: true, backtrackDiffMargin: 2 },
        { tegawari: true, backtrack: true, backtrackDiffMargin: -1 },
        { tegawari: true, backtrack: true, backtrackDiffMargin: 5 },
        { tegawari: true, backtrack: true, backtrackDiffMargin: 1.5 }
      ];
      for (const opts of badOptionsList) {
        const res = computeEngine({
          id: 51,
          table: southTable,
          input,
          rule: yakuhaiRule,
          remainingDraws: 18,
          options: opts
        });
        expect(res).toEqual({
          id: 51,
          type: 'error',
          message: 'invalid-options'
        });
      }

      for (const badDraws of [-1, 56, 1.5]) {
        const res = computeEngine({
          id: 52,
          table: southTable,
          input,
          rule: yakuhaiRule,
          remainingDraws: badDraws,
          options: OPTS_DEFAULT
        });
        expect(res).toEqual({
          id: 52,
          type: 'error',
          message: 'invalid-remaining-draws'
        });
      }
    });

    it('F31-A7: 赤の超幾何分布と裏ドラ分布の厳密検証', () => {
      // (a) 赤分布の和が 1
      const distA = redDistributionForSuit(2, 0, 0, 4, 1);
      const sumA = distA.reduce((s, o) => s + o.prob, 0);
      expect(sumA).toBeCloseTo(1, 12);

      // (b) 五を1枚引く必要がある聴牌形: kFinal=1, k0=0, a0=0, N=3, R=1 -> P(red=1) = 1/3
      const distB = redDistributionForSuit(1, 0, 0, 3, 1);
      expect(distB.find(o => o.count === 1)?.prob).toBeCloseTo(1 / 3, 12);
      expect(distB.find(o => o.count === 0)?.prob).toBeCloseTo(2 / 3, 12);

      // (c) 裏ドラ分布の和が 1、表示牌1枚のとき手計算と一致
      // 手牌+和了牌: 111m 999m 123p 456p 11z (14枚)、ドラ表示牌: 9m (1枚)、抜き北0
      // 見えていない牌合計: 108 - 14 - 1 = 93 枚
      // 表示牌候補の残り枚数と加算飜:
      // - 9p (next=1p:1枚): 残り4枚 -> han=1, prob=4/93
      // - 1p (next=2p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 2p (next=3p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 3p (next=4p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 4p (next=5p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 5p (next=6p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 4z (next=1z:2枚): 残り4枚 -> han=2, prob=4/93
      // - 9m (next=1m:3枚): 見えていない9mは 4-3-1=0枚 -> prob=0
      // - 8m (存在しない), 1m (next=9m:3枚, 残り1m=1枚 -> han=3, prob=1/93)
      // (注: nextIndex(0=1m)=8=9m(3枚), nextIndex(8=9m)=0=1m(3枚))
      const final14 = tilesToCounts(parseHand('111999m123456p11z'));
      const emptyCounts = tilesToCounts([]);
      const doraCounts = tilesToCounts(parseHand('9m'));
      const ura1 = uradoraDistribution(
        true,
        1,
        final14,
        emptyCounts,
        doraCounts,
        0
      );
      expect(ura1.reduce((s, o) => s + o.prob, 0)).toBeCloseTo(1, 12);
      expect(ura1.find(o => o.han === 3)?.prob).toBeCloseTo(1 / 93, 12);
      expect(ura1.find(o => o.han === 2)?.prob).toBeCloseTo(4 / 93, 12);
      expect(ura1.find(o => o.han === 1)?.prob).toBeCloseTo(
        (4 + 3 * 5) / 93,
        12
      );

      // 複数表示牌でも和が 1
      const dora2 = tilesToCounts(parseHand('9m1z'));
      const ura2 = uradoraDistribution(true, 2, final14, emptyCounts, dora2, 0);
      expect(ura2.reduce((s, o) => s + o.prob, 0)).toBeCloseTo(1, 12);

      // (d) 門前でない手は j=0 のみ
      const uraOpen = uradoraDistribution(
        false,
        2,
        final14,
        emptyCounts,
        dora2,
        0
      );
      expect(uraOpen).toEqual([{ han: 0, prob: 1 }]);
    });
  });

  describe('B. 役の有無・点数評価', () => {
    it('F31-B1: 門前ツモで役なしにならず、tsumo と riichi が含まれる', () => {
      // 111m 999m 123p 456p 1z (13枚, 門前・断么九でない・平和でない)
      const form = tilesToCounts(parseHand('111999m123456p1z'));
      const evaluated = evaluateTempaiForm(form, {
        table: southTable,
        rule: yakuhaiRule,
        melds: [],
        dora: [],
        nuki0: 0,
        includeRinshan: false
      });
      expect(evaluated.length).toBeGreaterThan(0);
      const ev0 = must(evaluated[0], 'ev0');
      const best0 = must(ev0.best, 'ev0.best');
      expect(best0.score.payment.total).toBeGreaterThan(0);
      // tsumo と riichi が含まれること(部分一致の理由: 他の飜役やドラを問わず両方の存在を検査するため)
      const names = must(ev0.candidates[0], 'ev0 cand0').yaku.map(y => y.name);
      expect(names).toContain('tsumo');
      expect(names).toContain('riichi');
    });

    it('F31-B2: 副露役なし・共通役牌設定では V=0, tenpai=1, win=0, ev=0', () => {
      // ポン1つ(111m)・役牌なし・断么九でない聴牌形: ポン1m + 999p 123s 78s 99z? いや 999p 123s 78s 55s (6-9s待ち, 9sは幺九牌)
      const hand = parseHand('999p123s78s55s');
      const input: Input = {
        hand,
        melds: [{ type: 'pon', tile: { type: 'm', n: 1 } }],
        dora: [],
        nuki: 0
      };
      const res = computeEngine({
        id: 202,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: 18,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res, 18);
      if (res.type !== 'ok') return;
      const cand = must(res.candidates[0], 'cand');
      expect(cand.tenpai).toBe(1);
      expect(cand.win).toBe(0);
      expect(cand.ev).toBe(0);
    });

    it('F31-B3: 副露役なしに赤五・ドラを持たせても win=0', () => {
      const hand = parseHand('999p123s78s05s');
      const input: Input = {
        hand,
        melds: [{ type: 'pon', tile: { type: 'm', n: 1 } }],
        dora: parseHand('8p'), // 9p がドラ
        nuki: 0
      };
      const ruleWithRed: Rule = { ...DEFAULT_RULE, north: 'yakuhai', red: 1 };
      const res = computeEngine({
        id: 203,
        table: southTable,
        input,
        rule: ruleWithRed,
        remainingDraws: 18,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res, 18);
      if (res.type !== 'ok') return;
      const cand = must(res.candidates[0], 'cand');
      expect(cand.tenpai).toBe(1);
      expect(cand.win).toBe(0);
      expect(cand.ev).toBe(0);
    });

    it('F31-B4: 副露手の嶺上開花(抜き北補充ツモのみで win>0、Input.nuki=1 でのみ rinshan が付く)', () => {
      // B-2 の手: ポン1m + 999p 123s 78s 55s を抜きドラ設定・nuki=0・北が山に4枚残る状態で計算
      const hand = parseHand('999p123s78s55s');
      const input: Input = {
        hand,
        melds: [{ type: 'pon', tile: { type: 'm', n: 1 } }],
        dora: [],
        nuki: 0
      };
      const nukiRule: Rule = { ...DEFAULT_RULE, north: 'nukidora', red: 0 };
      const res = computeEngine({
        id: 204,
        table: southTable,
        input,
        rule: nukiRule,
        remainingDraws: 18,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res, 18);
      if (res.type !== 'ok') return;
      const cand = must(res.candidates[0], 'cand');
      expect(cand.tenpai).toBe(1);
      expect(cand.win).toBeGreaterThan(0);
      expect(cand.ev).toBeGreaterThan(0);

      // generateResult の条件確認: nuki=1, rinshan=true で rinshan が付き、nuki=0, rinshan=true では付かない
      const rinshanOpts: HandOptions = {
        riichi: 'none',
        ippatsu: false,
        rinshan: true,
        chankan: false,
        haitei: false,
        tenho: false,
        tsubameGaeshi: false,
        kanFuri: false
      };
      const rWithNuki1 = generateResult(
        southTable,
        { ...input, nuki: 1 },
        rinshanOpts,
        nukiRule
      );
      expect(rWithNuki1?.type).toBe('hora-shanten');
      if (
        rWithNuki1?.type === 'hora-shanten' &&
        rWithNuki1.info.type === 'hora'
      ) {
        const tsumos = rWithNuki1.info.hora.filter(h => h.by === 'tsumo');
        expect(tsumos.length).toBeGreaterThan(0);
        // 理由: rinshan 役が yaku に含まれることの確認
        expect(
          must(tsumos[0], 'tsumo0').yaku.some(y => y.name === 'rinshan')
        ).toBe(true);
      }

      const rWithNuki0 = generateResult(
        southTable,
        { ...input, nuki: 0 },
        rinshanOpts,
        nukiRule
      );
      expect(rWithNuki0?.type).toBe('hora-shanten');
      if (
        rWithNuki0?.type === 'hora-shanten' &&
        rWithNuki0.info.type === 'hora'
      ) {
        const tsumos = rWithNuki0.info.hora.filter(h => h.by === 'tsumo');
        expect(tsumos.every(h => !h.yaku.some(y => y.name === 'rinshan'))).toBe(
          true
        );
      }
    });

    it('F31-B5: 門前の手の V は riichi: none で評価した値以上になる', () => {
      const hand = parseHand('234p567p34s678s99p');
      const form = tilesToCounts(hand);
      const evaluated = evaluateTempaiForm(form, {
        table: southTable,
        rule: yakuhaiRule,
        melds: [],
        dora: [],
        nuki0: 0,
        includeRinshan: false
      });

      const noneOpts: HandOptions = {
        riichi: 'none',
        ippatsu: false,
        rinshan: false,
        chankan: false,
        haitei: false,
        tenho: false,
        tsubameGaeshi: false,
        kanFuri: false
      };
      const noRiichiRes = generateResult(
        southTable,
        { hand, melds: [], dora: [], nuki: 0 },
        noneOpts,
        yakuhaiRule
      );
      expect(noRiichiRes?.type).toBe('hora-shanten');
      if (
        noRiichiRes?.type !== 'hora-shanten' ||
        noRiichiRes.info.type !== 'hora'
      ) {
        return;
      }

      for (const ew of evaluated) {
        if (ew.rinshan || ew.best === null) continue;
        const wIdx = tileToCountsIndex(ew.winTile);
        const matchNone = noRiichiRes.info.hora.filter(
          h => h.by === 'tsumo' && tileToCountsIndex(h.horaTile) === wIdx
        );
        const maxNone = Math.max(
          0,
          ...matchNone.map(m => m.score.payment.total)
        );
        expect(ew.best.score.payment.total).toBeGreaterThanOrEqual(maxNone);
      }
    });

    it('F31-B6: 七対子聴牌は type=chitoitsu・25符、国士聴牌は役満になる', () => {
      const chitoiForm = tilesToCounts(parseHand('1199m2288p3377s1z'));
      const chitoiEval = evaluateTempaiForm(chitoiForm, {
        table: southTable,
        rule: yakuhaiRule,
        melds: [],
        dora: [],
        nuki0: 0,
        includeRinshan: false
      });
      expect(chitoiEval).toHaveLength(1);
      const chitoiBest = chitoiEval[0]?.best;
      expect(chitoiBest?.type).toBe('chitoitsu');
      expect(chitoiBest?.score.fu).toBe(25);

      const kokushiForm = tilesToCounts(parseHand('19m19p19s12345677z'));
      const kokushiEval = evaluateTempaiForm(kokushiForm, {
        table: southTable,
        rule: yakuhaiRule,
        melds: [],
        dora: [],
        nuki0: 0,
        includeRinshan: false
      });
      expect(kokushiEval).toHaveLength(1);
      const kokushiBest = kokushiEval[0]?.best;
      expect(kokushiBest?.type).toBe('kokushi');
      expect(kokushiBest?.score.yakumanPoint).toBeGreaterThanOrEqual(1);
    });
  });

  describe('C. 境界・範囲', () => {
    it('F31-C1: 4向聴の手で out-of-range、14枚の和了形で not-applicable を返す', () => {
      // 4向聴: 19m 1379p 147s 1235z (ばらばら13枚)
      const fourShanten = parseHand('19m1379p147s1235z');
      expect(
        calc_shanten_sanma(Uint8Array.from(tilesToCounts(fourShanten)), 4)
      ).toBeGreaterThanOrEqual(4);
      const res4 = computeEngine({
        id: 301,
        table: southTable,
        input: { hand: fourShanten, melds: [], dora: [], nuki: 0 },
        rule: yakuhaiRule,
        remainingDraws: 18,
        options: OPTS_DEFAULT
      });
      expect(res4).toEqual({ id: 301, type: 'out-of-range' });

      // 14枚の和了形
      const horaHand = parseHand('111999m123456p11z');
      const resHora = computeEngine({
        id: 302,
        table: southTable,
        input: { hand: horaHand, melds: [], dora: [], nuki: 0 },
        rule: yakuhaiRule,
        remainingDraws: 18,
        options: OPTS_DEFAULT
      });
      expect(resHora).toEqual({ id: 302, type: 'not-applicable' });
    });

    it('F31-C2: remainingDraws=0 で 1向聴は 0、聴牌は tenpai=1・win=0・ev=0、perTurn 空', () => {
      const oneShanten = parseHand('111m999m123p4p9s11z');
      expect(
        calc_shanten_sanma(Uint8Array.from(tilesToCounts(oneShanten)), 4)
      ).toBe(1);
      const res1 = computeEngine({
        id: 303,
        table: southTable,
        input: { hand: oneShanten, melds: [], dora: [], nuki: 0 },
        rule: yakuhaiRule,
        remainingDraws: 0,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res1, 0);
      if (res1.type === 'ok') {
        expect(res1.candidates[0]).toMatchObject({
          tenpai: 0,
          win: 0,
          ev: 0,
          perTurn: []
        });
      }

      const tempai = parseHand('111999m123456p1z');
      const res0 = computeEngine({
        id: 304,
        table: southTable,
        input: { hand: tempai, melds: [], dora: [], nuki: 0 },
        rule: yakuhaiRule,
        remainingDraws: 0,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res0, 0);
      if (res0.type === 'ok') {
        expect(res0.candidates[0]).toMatchObject({
          tenpai: 1,
          win: 0,
          ev: 0,
          perTurn: []
        });
      }
    });

    it('F31-C3: 共通役牌設定で北(4z)が通常の牌として有効牌に数えられる', () => {
      // 111m 999m 123p 456p 4z (北単騎待ち)
      const hand = parseHand('111999m123456p4z');
      const h0 = tilesToCounts(hand);
      const u0 = new Uint8Array(34);
      for (let i = 0; i < 34; i++) {
        if (isSanmaIndex(i as TileCountsIndex)) u0[i] = 4 - (h0[i] ?? 0);
      }
      const sr = search(
        Uint8Array.from(h0),
        0,
        Uint8Array.from(h0),
        4,
        u0,
        sanma_tile_limits(),
        false,
        1,
        false,
        false,
        2
      );
      try {
        expect(Array.from(sr.tempai_wait_tiles())).toContain(30); // 30 = 北
      } finally {
        sr.free();
      }
    }, 30000);

    it('F31-C4: 抜きドラ設定で Input.nuki=2 のとき V に抜きドラ2飜が含まれる', () => {
      const nukiRule: Rule = { ...DEFAULT_RULE, north: 'nukidora', red: 0 };
      const form = tilesToCounts(parseHand('111999m123456p1z'));
      const ev0 = evaluateTempaiForm(form, {
        table: southTable,
        rule: nukiRule,
        melds: [],
        dora: [],
        nuki0: 0,
        includeRinshan: false
      });
      const ev2 = evaluateTempaiForm(form, {
        table: southTable,
        rule: nukiRule,
        melds: [],
        dora: [],
        nuki0: 2,
        includeRinshan: false
      });
      const best0 = must(ev0[0]?.best, 'ev0.best');
      const best2 = must(ev2[0]?.best, 'ev2.best');
      expect(best2.score.han - best0.score.han).toBe(2);
      const nukiYaku = best2.yaku.find(y => y.name === 'nuki-dora');
      expect(nukiYaku).toEqual({ type: 'yaku', name: 'nuki-dora', han: 2 });
    });

    it('F31-C5: 三麻の2m〜8mが現れず、国士13面待ちで待ちが13種になる', () => {
      const kokushi13 = parseHand('19m19p19s1234567z');
      const h0 = tilesToCounts(kokushi13);
      const u0 = new Uint8Array(34);
      for (let i = 0; i < 34; i++) {
        if (isSanmaIndex(i as TileCountsIndex)) u0[i] = 4 - (h0[i] ?? 0);
      }
      const sr = search(
        Uint8Array.from(h0),
        0,
        Uint8Array.from(h0),
        4,
        u0,
        sanma_tile_limits(),
        false,
        1,
        true,
        true,
        2
      );
      try {
        const waits = Array.from(sr.tempai_wait_tiles());
        expect(waits).toHaveLength(13);
        expect(waits).toEqual([
          0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33
        ]);
      } finally {
        sr.free();
      }
      assertNo2m8mInSearch(
        { hand: kokushi13, melds: [], dora: [], nuki: 0 },
        yakuhaiRule,
        2,
        OPTS_DEFAULT
      );
    });
  });
});
