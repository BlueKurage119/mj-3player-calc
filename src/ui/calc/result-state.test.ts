import { performance } from 'node:perf_hooks';
import { describe, expect, it, vi } from 'vitest';
import * as coreResult from '../../core/result';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { createInitialState } from '../state';
import { computeResult } from './compute';
import { evaluateResult } from './result-state';

const parseTiles = (s: string): Tile[] => {
  const tiles: Tile[] = [];
  let digits: string[] = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      digits.push(ch);
      continue;
    }
    if (ch !== 'm' && ch !== 'p' && ch !== 's' && ch !== 'z') {
      throw new Error(`不正な牌種: ${ch}`);
    }
    for (const d of digits) {
      const n = Number(d);
      if (ch === 'z') {
        tiles.push({ type: 'z', n } as Tile);
      } else if (n === 0) {
        tiles.push({ type: ch, n: 5, red: true });
      } else if (n === 5) {
        tiles.push({ type: ch, n: 5, red: false });
      } else {
        tiles.push({ type: ch, n } as Tile);
      }
    }
    digits = [];
  }
  return tiles;
};

describe('D1: 計算の呼び出し口と速度 (条件10・11)', () => {
  it('D1-10a: computeResult は dora と uradora を結合して generateResult に渡し、uradora キーを取り除く', () => {
    const spy = vi.spyOn(coreResult, 'generateResult');
    try {
      const base = createInitialState(createDefaultRule());
      const tileA: Tile = { type: 'm', n: 1 };
      const tileB: Tile = { type: 'p', n: 9 };
      const state = {
        ...base,
        input: {
          ...base.input,
          dora: [tileA],
          uradora: [tileB],
          nuki: 1
        }
      };

      const res = computeResult(state);
      expect(res).toBeNull();
      expect(spy).toHaveBeenCalledTimes(1);

      const passedInput = spy.mock.calls[0]?.[1];
      expect(passedInput).toEqual({
        hand: [],
        melds: [],
        dora: [tileA, tileB],
        nuki: 1
      });
      expect(passedInput && 'uradora' in passedInput).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('D1-10b: evaluateResult は loadError・loading・error・ok(null)・ok(Result) を正しく判定する', () => {
    const s = createInitialState(createDefaultRule());

    // loadError あり -> error
    const errObj = new Error('load failed');
    expect(evaluateResult(null, errObj, s)).toEqual({
      status: 'error',
      error: errObj
    });

    // compute === null -> loading
    expect(evaluateResult(null, null, s)).toEqual({
      status: 'loading'
    });

    // 例外を投げる compute -> error
    const calcErr = new Error('calc failed');
    const throwingCompute = () => {
      throw calcErr;
    };
    expect(evaluateResult(throwingCompute, null, s)).toEqual({
      status: 'error',
      error: calcErr
    });

    // null を返す compute -> { status: 'ok', result: null }
    const nullCompute = () => null;
    expect(evaluateResult(nullCompute, null, s)).toEqual({
      status: 'ok',
      result: null
    });

    // 値を返す compute -> { status: 'ok', result }
    const sampleResult: coreResult.Result = { type: 'just-hora' };
    const okCompute = () => sampleResult;
    expect(evaluateResult(okCompute, null, s)).toEqual({
      status: 'ok',
      result: sampleResult
    });
  });

  it('D1-11a: 代表牌姿3種(和了形・聴牌形・一向聴以上、各14枚)の computeResult が各10回で最大100ms以下', () => {
    const base = createInitialState(createDefaultRule());

    const cases: { name: string; hand: Tile[]; expectedType: string }[] = [
      {
        name: '和了形(14枚)',
        hand: parseTiles('111m999m123p456p11z'),
        expectedType: 'hora-shanten'
      },
      {
        name: '聴牌形(14枚・何切る)',
        hand: parseTiles('111m999m123p456p12z'),
        expectedType: 'discard-shanten'
      },
      {
        name: '一向聴以上(14枚)',
        hand: parseTiles('19m19p19s123456p12z'),
        expectedType: 'discard-shanten'
      }
    ];

    // WASM 初期化と JIT ウォームアップ
    for (const c of cases) {
      computeResult({
        ...base,
        input: { ...base.input, hand: c.hand }
      });
    }

    for (const c of cases) {
      let maxMs = 0;
      for (let i = 0; i < 10; i++) {
        const t0 = performance.now();
        const res = computeResult({
          ...base,
          input: { ...base.input, hand: c.hand }
        });
        const elapsed = performance.now() - t0;
        if (elapsed > maxMs) {
          maxMs = elapsed;
        }
        expect(res?.type).toBe(c.expectedType);
      }
      expect(maxMs).toBeLessThanOrEqual(100);
    }
  });
});
