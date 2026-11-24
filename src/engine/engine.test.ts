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
import { instantiateMeld } from '../core/input';
import type { Table } from '../core/table';
import {
  type Tile,
  type TileCountsIndex,
  isSanmaIndex,
  tileToCountsIndex,
  tilesToCounts
} from '../core/tile';
import { BENCH_HANDS, parseTiles } from '../../bench/engine/hands';
import { RULE_PRESETS } from '../core/rule-preset';
import { computeEngine, redBaselineOf } from './compute';
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

const mkOpts = (
  tegawari: boolean,
  backtrack: boolean,
  diffSlack: number,
  oneShantenSlack = false
): EngineOptions => ({ tegawari, backtrack, diffSlack, oneShantenSlack });

/** 構成A(手替わりなし。M は使われない) */
const OPTS_A: EngineOptions = mkOpts(false, false, 0);
/** B′(手替わりあり・戻しなし)。M を明示する */
const opBp = (m: number): EngineOptions => mkOpts(true, false, m);
/** B′+戻し。M を明示する */
const opBt = (m: number): EngineOptions => mkOpts(true, true, m);
/** 既定の構成(`DEFAULT_ENGINE_OPTIONS`。M は仮の既定) */
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

const NORTH_TILE: Tile = { type: 'z', n: 4 };

interface RawSearch {
  sr: ReturnType<typeof search>;
  h0: readonly number[];
  sRef: number;
  handLen: number;
  meldsM: number;
}

/** computeEngine と同じ引数で `search` を直接呼ぶ(テスト用。呼び出し側が `sr.free()` する) */
const rawSearch = (
  input: Input,
  rule: Rule,
  maxDraws: number,
  options: EngineOptions
): RawSearch => {
  const meldsM = 4 - input.melds.length;
  const handLen = meldsM * 3 + 1;
  const h0 = tilesToCounts(input.hand);
  const meldTiles = input.melds.flatMap(m => instantiateMeld(m, rule.red));
  const visibleCounts = tilesToCounts([
    ...input.hand,
    ...meldTiles,
    ...input.dora,
    ...Array<Tile>(input.nuki).fill(NORTH_TILE)
  ]);
  const u0 = new Uint8Array(34);
  for (let i = 0; i < 34; i++) {
    if (isSanmaIndex(i as TileCountsIndex)) {
      u0[i] = Math.max(0, 4 - (visibleCounts[i] ?? 0));
    }
  }
  // 起点の候補(13枚入力は入力そのもの、14枚入力は打牌後が3向聴以下の各打牌)と s_ref
  const cands: number[][] = [];
  if (input.hand.length === handLen) {
    cands.push([...h0]);
  } else {
    for (let i = 0; i < 34; i++) {
      if ((h0[i] ?? 0) === 0) continue;
      const c: number[] = [...h0];
      c[i] = (c[i] ?? 0) - 1;
      if (calc_shanten_sanma(Uint8Array.from(c), meldsM) <= 3) cands.push(c);
    }
  }
  const sRef = Math.max(
    ...cands.map(c => calc_shanten_sanma(Uint8Array.from(c), meldsM))
  );
  const hands = new Uint8Array(cands.length * 34);
  cands.forEach((c, i) => {
    hands.set(c, i * 34);
  });
  const sr = search(
    Uint8Array.from(h0),
    hands,
    meldsM,
    u0,
    sanma_tile_limits(),
    rule.north === 'nukidora',
    maxDraws,
    options.tegawari,
    options.backtrack,
    options.oneShantenSlack && sRef === 1
      ? Math.max(options.diffSlack, 1)
      : options.diffSlack,
    sRef
  );
  return { sr, h0, sRef, handLen, meldsM };
};

const shantenOf = (hand: ArrayLike<number>, meldsM: number): number =>
  calc_shanten_sanma(Uint8Array.from(hand), meldsM);

/** 入力の手 h0 からの入れ替え枚数 diff(H) = len(H) − Σ min(H, H0) (§3.6) */
const diffOf = (
  hand: ArrayLike<number>,
  h0: ArrayLike<number>,
  len: number
) => {
  let common = 0;
  for (let j = 0; j < 34; j++) common += Math.min(hand[j] ?? 0, h0[j] ?? 0);
  return len - common;
};

/** 探索の全状態(向聴1以上)が差の不変条件 diff ≤ (s_ref − s) + M を満たすことを検査する */
const assertDiffInvariant = (raw: RawSearch, m: number) => {
  const all = raw.sr.all_state_hands();
  let preTempai = 0;
  for (let off = 0; off < all.length; off += 34) {
    const hand = all.subarray(off, off + 34);
    const s = shantenOf(hand, raw.meldsM);
    if (s === 0) continue;
    preTempai++;
    expect(diffOf(hand, raw.h0, raw.handLen)).toBeLessThanOrEqual(
      raw.sRef - s + m
    );
  }
  expect(preTempai).toBe(raw.sr.state_count - raw.sr.tempai_count);
};

/** C-5: search の出力に 2m〜8m が一切現れないことを検査する */
const assertNo2m8mInSearch = (
  input: Input,
  rule: Rule,
  maxDraws: number,
  options: EngineOptions
) => {
  const raw = rawSearch(input, rule, maxDraws, options);
  const sr = raw.sr;
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

      for (const opts of [OPTS_A, opBp(0), OPTS_DEFAULT]) {
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

    it('F31-A4: B′(M=2)は維持打牌で有効牌を増やし構成Aより ev が大きく、向聴を増やす打牌は方針に現れず、差の不変条件を満たす', () => {
      // 副露3つ(ポン7z・ポン6z・ポン5z) + 手牌4枚: 11z 1p 9s (s0=1=s_ref, T=3)
      // 端牌 1p・9s を中張牌(3p〜7p・3s〜7s 等)へ振り替える維持打牌で有効牌が増えるため
      // B′ の ev が構成Aより大きくなる。s0=1 では M=0 は維持が起きず A と一致する
      // (§3.6a 退化特性)ので M=2 で検査する。維持は diff ≤ (1−1)+M = 2 まで許される
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
      const resBp2 = computeEngine({
        id: 402,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: T,
        options: opBp(2)
      });
      const resBp0 = computeEngine({
        id: 403,
        table: southTable,
        input,
        rule: yakuhaiRule,
        remainingDraws: T,
        options: opBp(0)
      });
      assertPerTurnValid(resA, T);
      assertPerTurnValid(resBp2, T);
      assertPerTurnValid(resBp0, T);
      if (resA.type !== 'ok' || resBp2.type !== 'ok' || resBp0.type !== 'ok') {
        throw new Error('unexpected non-ok');
      }
      const evA = must(resA.candidates[0], 'a cand').ev;
      expect(must(resBp2.candidates[0], 'bp2 cand').ev).toBeGreaterThan(evA);
      // 退化特性: s0=1 の M=0 は構成Aと同値
      expect(must(resBp0.candidates[0], 'bp0 cand').ev).toBeCloseTo(evA, 12);

      // 差の不変条件 diff ≤ (s_ref − s) + M を M=0・1・2 で検査
      for (const m of [0, 1, 2]) {
        const raw = rawSearch(input, yakuhaiRule, T, opBp(m));
        try {
          assertDiffInvariant(raw, m);
        } finally {
          raw.sr.free();
        }
      }

      // policy_discard で向聴を増やす打牌(戻し)が現れないことを全到達状態・有効ツモで検査 (M=2)
      const raw = rawSearch(input, yakuhaiRule, T, opBp(2));
      const sr = raw.sr;
      try {
        const wt = sr.tempai_wait_tiles();
        const vals = new Float64Array(wt.length * 2);
        for (let i = 0; i < wt.length; i++) vals[i * 2] = 1000;
        solve(sr, vals);

        const allHands = sr.all_state_hands();
        for (let off = 0; off < allHands.length; off += 34) {
          const sh = allHands.subarray(off, off + 34);
          const curS = shantenOf(sh, 1);
          if (curS === 0) continue;
          for (let t = 1; t <= T; t++) {
            for (let k = 0; k < 34; k++) {
              if (!isSanmaIndex(k as TileCountsIndex)) continue;
              const d = policy_discard(sr, sh, t, 0, k);
              if (d >= 0) {
                const nxt = Uint8Array.from(sh);
                nxt[k] = (nxt[k] ?? 0) + 1;
                nxt[d] = (nxt[d] ?? 0) - 1;
                expect(shantenOf(nxt, 1)).toBeLessThanOrEqual(curS);
              }
            }
          }
        }
      } finally {
        sr.free();
      }
    }, 60000);

    /** 2副露(ポン7z・ポン6z)の入力を作る */
    const twoMeldInput = (handStr: string): Input => ({
      hand: parseHand(handStr),
      melds: [
        { type: 'pon', tile: { type: 'z', n: 7 } },
        { type: 'pon', tile: { type: 'z', n: 6 } }
      ],
      dora: [],
      nuki: 0
    });

    const expectMatchesReference = (
      input: Input,
      T: number,
      opts: EngineOptions
    ) => {
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
      return cand;
    };

    it('F31-A5: s0=1 の2副露・T=4 で、構成A・B′・B′+戻し(M=0・1)が参照実装と 1e-9 で一致し、戻しは起きず B′ と B′+戻しが一致する', () => {
      // 2副露(ポン7z・ポン6z) + 手牌7枚 2p8p 123s 77s (s0=1: 3p を引いて 8p 切りで 23p 123s 77s の聴牌)
      // この起点では戻しの条件の右辺が (1−2)+M = M−1: M=0 は不可、M=1 は diff=0(元の手)のみ。
      // 元の手は1向聴なので戻せず、聴牌後も戻せない。よって B′ と B′+戻しは一致する
      const input = twoMeldInput('28p12377s');
      const T = 4;
      expect(shantenOf(tilesToCounts(input.hand), 2)).toBe(1);

      for (const m of [0, 1]) {
        const a = expectMatchesReference(input, T, OPTS_A);
        const bp = expectMatchesReference(input, T, opBp(m));
        const bt = expectMatchesReference(input, T, opBt(m));
        expect(bp.ev).toBeGreaterThanOrEqual(a.ev - 1e-12);
        expect(bt.ev).toBeCloseTo(bp.ev, 12);
        expect(bt.win).toBeCloseTo(bp.win, 12);
        expect(bt.tenpai).toBeCloseTo(bp.tenpai, 12);

        // 戻しが起きない: B′+戻し の到達状態に向聴2の手が無い
        const raw = rawSearch(input, yakuhaiRule, T, opBt(m));
        try {
          const all = raw.sr.all_state_hands();
          for (let off = 0; off < all.length; off += 34) {
            expect(
              shantenOf(all.subarray(off, off + 34), 2)
            ).toBeLessThanOrEqual(1);
          }
          assertDiffInvariant(raw, m);
        } finally {
          raw.sr.free();
        }
      }
    }, 120000);

    it('F31-A5d: 戻しが起きる起点で参照実装と一致し、戻しでしか到達しない手が到達集合に含まれる', () => {
      // (1) s0=1・M=2・T=4: 起点で1枚入れ替えた2向聴の手(diff=1 ≤ 1−2+2)へ戻せる。
      //     最短は 戻し→前進→前進→和了 の4巡
      // (2) s0=2・M=1・T=5: 1回前進して1向聴(diff=1)の後、前進で入れた牌を捨てる戻し
      //     (2向聴、diff=1 ≤ 2−2+1)が許される。最短は 前進→戻し→前進→前進→和了 の5巡
      const cases: { handStr: string; m: number; T: number }[] = [
        { handStr: '28p12377s', m: 2, T: 4 },
        { handStr: '34467s12z', m: 1, T: 5 }
      ];
      for (const { handStr, m, T } of cases) {
        const input = twoMeldInput(handStr);
        expectMatchesReference(input, T, opBt(m));

        const withBack = rawSearch(input, yakuhaiRule, T, opBt(m));
        const noBack = rawSearch(input, yakuhaiRule, T, opBp(m));
        try {
          const keyOf = (a: Uint8Array) => a.join(',');
          const base = new Set<string>();
          const noAll = noBack.sr.all_state_hands();
          for (let off = 0; off < noAll.length; off += 34) {
            base.add(keyOf(noAll.subarray(off, off + 34)));
          }
          const all = withBack.sr.all_state_hands();
          let onlyByBacktrack = 0;
          for (let off = 0; off < all.length; off += 34) {
            const h = all.subarray(off, off + 34);
            if (!base.has(keyOf(h))) {
              onlyByBacktrack++;
              // 戻しでしか到達しない手は、探索の起点より向聴が大きい手を経由する
            }
          }
          // 戻しの遷移(向聴が増える遷移)が存在する。B′・構成Aには存在しない
          expect(withBack.sr.backtrack_edge_count()).toBeGreaterThan(0);
          expect(noBack.sr.backtrack_edge_count()).toBe(0);
          // (1) は戻しでしか到達しない手もある。(2) の戻し先(向聴2・diff=1)は起点からの維持でも
          // 到達できるので手の集合は増えず、遷移だけが増える(第14版: 辺の存在の検査)
          if (handStr === '28p12377s') {
            expect(onlyByBacktrack).toBeGreaterThan(0);
          }
          assertDiffInvariant(withBack, m);
        } finally {
          withBack.sr.free();
          noBack.sr.free();
        }
      }
    }, 600000);

    // A-4d: 各 (手, M) を別の it にする(1テストの同期計算を短くし、vitest の RPC タイムアウトを避ける)。
    // S3 は S3-06(1副露。M=1 で約5千状態)を使う。S3-01 のような約1万6千状態の手は1テストの同期計算が長すぎる
    const a4dCases: {
      label: string;
      m: number;
      Ts: number[];
      make: () => { input: Input; rule: Rule };
    }[] = [
      ...[
        { m: 0, Ts: [6, 12, 18] },
        { m: 1, Ts: [6, 12, 18] }
      ].map(({ m, Ts }) => ({
        label: 'S3-06',
        m,
        Ts,
        make: () => {
          const s3 = BENCH_HANDS.find(h => h.id === 'S3-06');
          const preset = RULE_PRESETS[0]?.rule;
          if (!s3 || !preset) throw new Error('S3-06 or preset not found');
          return {
            input: {
              hand: parseTiles(s3.handStr),
              melds: s3.melds,
              dora: [],
              nuki: s3.nuki
            },
            rule: preset
          };
        }
      })),
      ...[0, 1].map(m => ({
        label: '2副露 34467s12z',
        m,
        Ts: [6, 12, 18],
        make: () => ({ input: twoMeldInput('34467s12z'), rule: yakuhaiRule })
      }))
    ];
    for (const { label, m, Ts, make } of a4dCases) {
      it(`F31-A4d: ${label} M=${m} の到達する聴牌前の手は差の不変条件を満たし、T=6 の到達集合は T=12 の到達集合に含まれる`, () => {
        const { input, rule } = make();
        const counts: Record<number, number> = {};
        const keysByT = new Map<number, Set<string>>();
        for (const T of Ts) {
          const raw = rawSearch(input, rule, T, opBt(m));
          try {
            assertDiffInvariant(raw, m);
            const all = raw.sr.all_state_hands();
            const keys = new Set<string>();
            for (let off = 0; off < all.length; off += 34) {
              const h = all.subarray(off, off + 34);
              if (shantenOf(h, raw.meldsM) > 0) keys.add(h.join(','));
            }
            keysByT.set(T, keys);
            counts[T] = raw.sr.state_count - raw.sr.tempai_count;
            expect(keys.size).toBe(counts[T]);
          } finally {
            raw.sr.free();
          }
        }
        // 参考測定(合否にしない): 聴牌前の手の異なるキー数
        console.log(`A-4d参考 ${label} M=${m}`, JSON.stringify(counts));
        for (const k of keysByT.get(6) ?? []) {
          expect(keysByT.get(12)?.has(k)).toBe(true);
        }
      }, 300000);
    }

    it('F31-A5e: oneShantenSlack は s_ref=1 のときだけ実効 M を max(diffSlack,1) にする(M=1 相当と一致、s_ref≥2 は無影響)', () => {
      const run = (input: Input, opts: EngineOptions, T: number) => {
        const res = computeEngine({
          id: 560,
          table: southTable,
          input,
          rule: yakuhaiRule,
          remainingDraws: T,
          options: opts
        });
        if (res.type !== 'ok') throw new Error('unexpected non-ok');
        return must(res.candidates[0], 'cand');
      };
      const close = (a: ReturnType<typeof run>, b: ReturnType<typeof run>) => {
        expect(Math.abs(a.tenpai - b.tenpai)).toBeLessThan(1e-12);
        expect(Math.abs(a.win - b.win)).toBeLessThan(1e-12);
        expect(Math.abs(a.ev - b.ev)).toBeLessThan(1e-9);
      };
      // s_ref=1(13枚入力 s0=1): oneShantenSlack=true,M=0 は M=1 と一致し、M=0 とは異なる
      const one = twoMeldInput('28p12377s');
      expect(shantenOf(tilesToCounts(one.hand), 2)).toBe(1);
      const T = 4;
      const m0 = run(one, opBt(0), T);
      const m1 = run(one, opBt(1), T);
      const o0 = run(one, mkOpts(true, true, 0, true), T);
      close(o0, m1);
      // 参照実装(実効 M の式を独立に持つ)とも一致
      expectMatchesReference(one, T, mkOpts(true, true, 0, true));
      expect(Math.abs(o0.ev - m0.ev)).toBeGreaterThan(1e-6);
      // M=2 のときは max(2,1)=2 のまま(true でも false でも同じ)
      close(run(one, mkOpts(true, true, 2, true), 3), run(one, opBt(2), 3));
      // s_ref≥2: 無影響(true でも M=0 のまま)
      const two = twoMeldInput('34467s12z');
      expect(shantenOf(tilesToCounts(two.hand), 2)).toBe(2);
      close(run(two, mkOpts(true, true, 0, true), 4), run(two, opBt(0), 4));
      // 14枚入力で候補の向聴の最大が2(s_ref=2)でも無影響
      const t14 = twoMeldInput('28p12377s3p');
      const a14 = computeEngine({
        id: 561,
        table: southTable,
        input: t14,
        rule: yakuhaiRule,
        remainingDraws: 3,
        options: mkOpts(true, true, 0, true)
      });
      const b14 = computeEngine({
        id: 562,
        table: southTable,
        input: t14,
        rule: yakuhaiRule,
        remainingDraws: 3,
        options: opBt(0)
      });
      if (a14.type !== 'ok' || b14.type !== 'ok') throw new Error('non-ok');
      const sRef14 = Math.max(...a14.candidates.map(c => c.shanten));
      for (let i = 0; i < a14.candidates.length; i++) {
        const x = must(a14.candidates[i], 'a14');
        const y = must(b14.candidates[i], 'b14');
        if (sRef14 === 1) {
          expect(x.shanten).toBeLessThanOrEqual(1);
        } else {
          expect(x.discard).toEqual(y.discard);
          expect(Math.abs(x.ev - y.ev)).toBeLessThan(1e-9);
        }
      }
    }, 120000);

    it('F31-A5b: 無効・範囲外オプションと残りツモ回数で error を返す', () => {
      const hand = parseHand('111999m123456p1z');
      const input: Input = { hand, melds: [], dora: [], nuki: 0 };

      const badOptionsList: EngineOptions[] = [
        mkOpts(false, true, 0),
        mkOpts(true, true, -1),
        mkOpts(true, true, 3),
        mkOpts(true, true, 1.5),
        mkOpts(true, false, -1),
        mkOpts(true, false, 3),
        mkOpts(true, false, 1.5),
        {
          ...mkOpts(true, true, 0),
          oneShantenSlack: 'yes' as unknown as boolean
        },
        {
          ...mkOpts(true, true, 0),
          oneShantenSlack: undefined as unknown as boolean
        }
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

      // (c) 裏ドラ分布の和が 1、表示牌1枚のとき手計算と一致(確定 Q21 の山の式で母集団を数える)
      // 入力の手 H0: 111m 999m 123p 456p 1z (13枚。和了牌は 1z)、ドラ表示牌: 9m (1枚)、抜き北0
      // 最終14枚 H_f = 111m 999m 123p 456p 11z。H_f[i] − H0[i] は 1z だけ 1
      // 母集団 c_i = u0[i] − max(0, H_f[i] − H0[i]): u0 は 4 − (H0 + ドラ表示牌)
      // 見えていない牌合計: 108 − 13 − 1 − 1(和了牌 1z の分) = 93 枚
      // 表示牌候補の残り枚数と加算飜:
      // - 9p (next=1p:1枚): 残り4枚 -> han=1, prob=4/93
      // - 1p (next=2p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 2p (next=3p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 3p (next=4p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 4p (next=5p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 5p (next=6p:1枚): 残り3枚 -> han=1, prob=3/93
      // - 4z (next=1z:2枚): 残り4枚 -> han=2, prob=4/93
      // - 9m (next=1m:3枚): 見えていない9mは 4-3-1=0枚 -> prob=0
      // - 1m (next=9m:3枚): 残り1m=1枚 -> han=3, prob=1/93
      // (注: nextIndex(0=1m)=8=9m(3枚), nextIndex(8=9m)=0=1m(3枚))
      const h0 = tilesToCounts(parseHand('111999m123456p1z'));
      const final14 = tilesToCounts(parseHand('111999m123456p11z'));
      const emptyCounts = tilesToCounts([]);
      const u0Of = (handStr: string, doraStr: string) => {
        const vis = tilesToCounts([
          ...parseHand(handStr),
          ...parseHand(doraStr)
        ]);
        return Array.from({ length: 34 }, (_, i) =>
          isSanmaIndex(i as TileCountsIndex) ? 4 - (vis[i] ?? 0) : 0
        );
      };
      const u0a = u0Of('111999m123456p1z', '9m');
      const ura1 = uradoraDistribution(
        true,
        1,
        final14,
        emptyCounts,
        u0a,
        h0,
        0,
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
      const u0b = u0Of('111999m123456p1z', '9m1z');
      const ura2 = uradoraDistribution(
        true,
        2,
        final14,
        emptyCounts,
        u0b,
        h0,
        0,
        0
      );
      expect(ura2.reduce((s, o) => s + o.prob, 0)).toBeCloseTo(1, 12);

      // (d) 門前でない手は j=0 のみ
      const uraOpen = uradoraDistribution(
        false,
        2,
        final14,
        emptyCounts,
        u0b,
        h0,
        0,
        0
      );
      expect(uraOpen).toEqual([{ han: 0, prob: 1 }]);
    });

    it('F31-A7e: 14枚入力で五pを初打で捨てる候補があっても、到達可能な全和了形で赤の分布の総和が1(空の分布が無い)', () => {
      // 14枚入力: 五p を3枚(うち赤1枚 = 0p)持ち、他に五p は見えていない(N=1, R=0 or 1)。
      // 山の式(§3.2)は入力の手 H0 を基準にするので、五p を捨てた候補でも捨てた五を引き直せ、
      // 最終形の五p は最大 4 枚(= k0=3 の H0 基準では d=1 ≤ N=1)。確定 Q20 案a の式で空にならない
      const rule: Rule = { ...DEFAULT_RULE, north: 'yakuhai', red: 1 };
      const input: Input = {
        hand: parseHand('550p123s456s77s11z9m'),
        melds: [],
        dora: [],
        nuki: 0
      };
      expect(input.hand).toHaveLength(14);
      const raw = rawSearch(input, rule, 3, opBp(1));
      try {
        const h0 = tilesToCounts(input.hand);
        expect(h0[13]).toBe(3);
        // computeEngine が使う赤の基準: H0 の五p は3枚・赤1枚、見えていない五p は N=1、赤は R=0
        const visible = [...input.hand];
        const u0 = Array.from({ length: 34 }, (_, i) =>
          isSanmaIndex(i as TileCountsIndex)
            ? 4 - (tilesToCounts(visible)[i] ?? 0)
            : 0
        );
        const base = redBaselineOf(input.hand, visible, u0, rule);
        expect(base.k0.p).toBe(3);
        expect(base.a0.p).toBe(1);
        expect(base.availableTotal.p).toBe(1);
        expect(base.availableRed.p).toBe(0);
        const distOf = (kFinal: number) =>
          redDistributionForSuit(
            kFinal,
            base.k0.p,
            base.a0.p,
            base.availableTotal.p,
            base.availableRed.p
          );
        // 最終形の五p が 0〜4 枚のどれでも分布が空にならず総和が1
        for (let kFinal = 0; kFinal <= 4; kFinal++) {
          const dist = distOf(kFinal);
          expect(dist.length).toBeGreaterThan(0);
          expect(dist.reduce((a, o) => a + o.prob, 0)).toBeCloseTo(1, 12);
        }
        // 探索で到達する全和了形でも同様
        const tempai = raw.sr.tempai_hands();
        const waitCounts = raw.sr.tempai_wait_counts();
        const waitTiles = raw.sr.tempai_wait_tiles();
        let cursor = 0;
        let checked = 0;
        for (let ti = 0; ti < waitCounts.length; ti++) {
          const form = Array.from(tempai.subarray(ti * 34, (ti + 1) * 34));
          for (let wi = 0; wi < (waitCounts[ti] ?? 0); wi++) {
            const w = waitTiles[cursor + wi] ?? 0;
            const fin = [...form];
            fin[w] = (fin[w] ?? 0) + 1;
            const dist = distOf(fin[13] ?? 0);
            expect(dist.length).toBeGreaterThan(0);
            expect(dist.reduce((a, o) => a + o.prob, 0)).toBeCloseTo(1, 12);
            checked++;
          }
          cursor += waitCounts[ti] ?? 0;
        }
        expect(checked).toBeGreaterThan(0);
        // 対比: 打牌候補の手(k0=2)を基準にすると kFinal=4 (d=2 > N=1) は空になる(旧式の失敗)
        expect(redDistributionForSuit(4, 2, 1, 1, 0)).toEqual([]);
      } finally {
        raw.sr.free();
      }
    }, 60000);

    it('F31-A7f: 初打で捨てた既知牌は裏表示牌に選ばれない(確定 Q21 の式で手計算)', () => {
      // 入力(14枚) H0: 555z 666z 123p 456p 12s と、ドラ表示牌 5z → 5z は4枚すべて見えている(u0[5z]=0)。
      // 初打で 5z を1枚捨てた候補の最終14枚 H_f = 55z 666z 123p 456p 12s + 和了牌 3s = 55z 666z 123p 456p 123s。
      // 山の式の母集団 c_{5z} = u0[5z] − max(0, H_f[5z] − H0[5z]) = 0 − 0 = 0 なので、
      // 5z が裏表示牌に選ばれる確率は 0。5z が選ばれたときだけ加算飜 3(次の牌 6z が H_f に3枚)になるので、
      // han=3 の確率は 0 のはず(H_f に3枚あるのは 666z だけで、123p・456p・123s は各1枚)。
      // 旧式(4 − (H_f + ドラ表示牌)): 4 − (2 + 1) = 1 枚残っていることになり han=3 が正の確率になる(対比)
      const h0 = tilesToCounts(parseHand('555666z123456p12s'));
      const final14 = tilesToCounts(parseHand('55666z123456p123s'));
      const vis = tilesToCounts([
        ...parseHand('555666z123456p12s'),
        ...parseHand('5z')
      ]);
      const u0 = Array.from({ length: 34 }, (_, i) =>
        isSanmaIndex(i as TileCountsIndex) ? 4 - (vis[i] ?? 0) : 0
      );
      expect(u0[31]).toBe(0);
      const dist = uradoraDistribution(
        true,
        1,
        final14,
        tilesToCounts([]),
        u0,
        h0,
        0,
        0
      );
      expect(dist.reduce((a, o) => a + o.prob, 0)).toBeCloseTo(1, 12);
      expect(dist.find(o => o.han === 3)).toBeUndefined();
      // 対比(旧式の母集団): 5z が1枚残っていることになる
      const oldRemaining5z = 4 - ((final14[31] ?? 0) + 1);
      expect(oldRemaining5z).toBe(1);
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

    it('F31-B4b: 副露・役なし・北待ち(抜きドラ設定)は、北を抜いて補充ツモの嶺上開花で和了できる(確定 Q19 案(ii))', () => {
      // 2副露(ポン1m・ポン9m。役牌なし・トイトイでない) + 手牌7枚 234s 44z 99p の聴牌(北と 9p の双碰)。
      // 副露の手で 234s があり(混全帯么九・トイトイにならず)、和了牌のツモ和了は役なし(北は抜きドラ設定で役牌でない)。
      // §3.2 の記号: 見えていない北 u_N=2、9p が u_X=2、全体 U=108−7−6=95。T=1:
      //  (ii): 1巡目に北を引く(u_N/U)→ 抜いて補充ツモ(e=1。北は u_N−1=1、全体 U−1=94)
      //        → 北または 9p を引けば嶺上開花で役ありの和了: win = (u_N/U)×((u_N−1)+u_X)/(U−1)
      //        9p を最初に引いた場合は役なしでツモ切り(和了しない)
      //  (i) だと北は待ちに入っていて抜かれず役もないので win=0
      const input: Input = {
        hand: parseHand('234s44z99p'),
        melds: [
          { type: 'pon', tile: { type: 'm', n: 1 } },
          { type: 'pon', tile: { type: 'm', n: 9 } }
        ],
        dora: [],
        nuki: 0
      };
      const nukiRule: Rule = { ...DEFAULT_RULE, north: 'nukidora', red: 0 };
      const res = computeEngine({
        id: 205,
        table: southTable,
        input,
        rule: nukiRule,
        remainingDraws: 1,
        options: OPTS_DEFAULT
      });
      assertPerTurnValid(res, 1);
      if (res.type !== 'ok') throw new Error('unexpected non-ok');
      const cand = must(res.candidates[0], 'cand');
      const expectedWin = (2 / 95) * ((1 + 2) / 94);
      expect(cand.tenpai).toBe(1);
      expect(expectedWin).toBeGreaterThan(0);
      expect(Math.abs(cand.win - expectedWin)).toBeLessThan(1e-12);
      expect(
        Math.abs(must(cand.perTurn[0], 'turn 1').win - expectedWin)
      ).toBeLessThan(1e-12);
      expect(cand.ev).toBeGreaterThan(0);

      // 和了候補に rinshan が含まれる(補充ツモ経由の評価)
      const form = tilesToCounts(input.hand);
      const evaluated = evaluateTempaiForm(form, {
        table: southTable,
        rule: nukiRule,
        melds: input.melds,
        dora: [],
        nuki0: 0,
        includeRinshan: true
      });
      const rinshanNorth = evaluated.find(
        e => e.rinshan && tileToCountsIndex(e.winTile) === 30
      );
      expect(rinshanNorth?.best).not.toBeNull();
      expect(
        rinshanNorth?.candidates.some(c =>
          c.yaku.some(y => y.name === 'rinshan')
        )
      ).toBe(true);
      // 嶺上でない評価は役なし(best === null)
      const plainNorth = evaluated.find(
        e => !e.rinshan && tileToCountsIndex(e.winTile) === 30
      );
      expect(plainNorth?.best).toBeNull();
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
      const raw = rawSearch(
        { hand, melds: [], dora: [], nuki: 0 },
        yakuhaiRule,
        1,
        OPTS_A
      );
      const sr = raw.sr;
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
      const raw = rawSearch(
        { hand: kokushi13, melds: [], dora: [], nuki: 0 },
        yakuhaiRule,
        1,
        opBt(2)
      );
      const sr = raw.sr;
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
