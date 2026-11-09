import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, appReducer, createInitialState } from '../state';
import {
  TENKEY_HONOR_HINTS,
  mapTenkeyKey,
  shouldHandleKeyTarget,
  tenkeyActionKeysFor
} from './tenkey-logic';

describe('D3: 物理キー入力の割り当てと対象判定 (D3-K・F)', () => {
  const baseEvent = {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false
  };

  it('D3-K1: mapTenkeyKey はテンキー方式で "7" を digit、"M" を suit m に変換する', () => {
    expect(mapTenkeyKey({ ...baseEvent, key: '7' }, 'tenkey')).toEqual({
      kind: 'digit',
      digit: '7'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'M' }, 'tenkey')).toEqual({
      kind: 'suit',
      suit: 'm'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'p' }, 'tenkey')).toEqual({
      kind: 'suit',
      suit: 'p'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'S' }, 'tenkey')).toEqual({
      kind: 'suit',
      suit: 's'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'z' }, 'tenkey')).toEqual({
      kind: 'suit',
      suit: 'z'
    });
  });

  it('D3-K2: mapTenkeyKey はパレット方式で "7"・"m" が null', () => {
    expect(mapTenkeyKey({ ...baseEvent, key: '7' }, 'palette')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'm' }, 'palette')).toBeNull();
  });

  it('D3-K3: mapTenkeyKey は両方式で Backspace が backspace、Enter が enter', () => {
    expect(mapTenkeyKey({ ...baseEvent, key: 'Backspace' }, 'tenkey')).toEqual({
      kind: 'backspace'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'Enter' }, 'tenkey')).toEqual({
      kind: 'enter'
    });
    expect(mapTenkeyKey({ ...baseEvent, key: 'Backspace' }, 'palette')).toEqual(
      {
        kind: 'backspace'
      }
    );
    expect(mapTenkeyKey({ ...baseEvent, key: 'Enter' }, 'palette')).toEqual({
      kind: 'enter'
    });
  });

  it('D3-K4: mapTenkeyKey は両方式で Delete・"a"・"A" が null', () => {
    expect(mapTenkeyKey({ ...baseEvent, key: 'Delete' }, 'tenkey')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'a' }, 'tenkey')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'A' }, 'tenkey')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'Delete' }, 'palette')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'a' }, 'palette')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'A' }, 'palette')).toBeNull();
  });

  it('D3-K5: mapTenkeyKey は metaKey 付き Backspace・ctrlKey 付き "1"・isComposing の "1" が null', () => {
    expect(
      mapTenkeyKey({ ...baseEvent, key: 'Backspace', metaKey: true }, 'tenkey')
    ).toBeNull();
    expect(
      mapTenkeyKey({ ...baseEvent, key: '1', ctrlKey: true }, 'tenkey')
    ).toBeNull();
    expect(
      mapTenkeyKey({ ...baseEvent, key: '1', altKey: true }, 'tenkey')
    ).toBeNull();
    expect(
      mapTenkeyKey({ ...baseEvent, key: '1', isComposing: true }, 'tenkey')
    ).toBeNull();
  });

  it('D3-K6: mapTenkeyKey は Escape が null', () => {
    expect(mapTenkeyKey({ ...baseEvent, key: 'Escape' }, 'tenkey')).toBeNull();
    expect(mapTenkeyKey({ ...baseEvent, key: 'Escape' }, 'palette')).toBeNull();
  });

  it('D3-F1: shouldHandleKeyTarget は null で真', () => {
    expect(shouldHandleKeyTarget(null)).toBe(true);
  });

  it('D3-F2: shouldHandleKeyTarget は closest を持つ擬似要素で .bottom-sheet の有無により真偽', () => {
    const insideTarget = {
      closest: (selector: string) =>
        selector === '.bottom-sheet' ? ({} as Element) : null
    } as unknown as EventTarget;
    expect(shouldHandleKeyTarget(insideTarget)).toBe(true);

    const outsideTarget = {
      closest: () => null
    } as unknown as EventTarget;
    expect(shouldHandleKeyTarget(outsideTarget)).toBe(false);

    const targetWithoutClosest = {} as EventTarget;
    expect(shouldHandleKeyTarget(targetWithoutClosest)).toBe(false);
  });

  it('D3: TENKEY_HONOR_HINTS は 1〜7 と 0 の補助表示文字を保持する', () => {
    expect(TENKEY_HONOR_HINTS).toEqual({
      '1': '東',
      '2': '南',
      '3': '西',
      '4': '北',
      '5': '白',
      '6': '發',
      '7': '中',
      '0': '赤5'
    });
  });
});

describe('D4-C14g: テンキーの機能キーの対象別化 (確定事項21、2.3)', () => {
  const t1p: Tile = { type: 'p', n: 1 };
  const t2p: Tile = { type: 'p', n: 2 };
  const base = createInitialState(createDefaultRule());
  const make = (
    focus: AppState['inputFocus'],
    buffer: string,
    count: number
  ): AppState => {
    const tiles = [t1p, t2p, t1p, t2p].slice(0, count);
    return {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: focus,
      tenkeyBuffer: buffer,
      input: {
        ...base.input,
        hand: focus?.type === 'hand' ? tiles : [],
        dora: focus?.type === 'dora' ? tiles : [],
        uradora: focus?.type === 'uradora' ? tiles : [],
        melds: focus?.type === 'meld' ? [{ type: 'pon', tile: null }] : []
      }
    };
  };

  it('D4-C14g-1: 全行(対象 × バッファ × 牌数)の label・action・disabled が表どおり', () => {
    for (const buffer of ['', '1']) {
      for (const count of [0, 2]) {
        const empty = buffer === '' && count === 0;
        const hand = tenkeyActionKeysFor(make({ type: 'hand' }, buffer, count));
        expect(hand.backspace.disabled).toBe(empty);
        expect(hand.clear).toEqual({
          action: { type: 'clear-hand' },
          label: '手牌をクリア',
          disabled: false
        });
        for (const target of ['dora', 'uradora'] as const) {
          const k = tenkeyActionKeysFor(make({ type: target }, buffer, count));
          expect(k.backspace.disabled).toBe(empty);
          expect(k.clear).toEqual({
            action: { type: 'clear-indicators', target },
            label:
              target === 'dora' ? 'ドラ表示牌をクリア' : '裏ドラ表示牌をクリア',
            disabled: empty
          });
        }
        const m = tenkeyActionKeysFor(
          make({ type: 'meld', i: 0 }, buffer, count)
        );
        expect(m.backspace.disabled).toBe(buffer === '');
        expect(m.clear).toEqual({
          action: null,
          label: '副露をクリア',
          disabled: true
        });
      }
    }
  });

  it('D4-C14g-2: ドラ入力中のACを dispatch してもドラだけが空になり手牌は不変', () => {
    const hand13 = Array.from({ length: 13 }, (): Tile => t1p);
    const s: AppState = {
      ...make({ type: 'dora' }, '1', 2),
      input: { ...make({ type: 'dora' }, '1', 2).input, hand: hand13 }
    };
    const action = tenkeyActionKeysFor(s).clear.action;
    expect(action).not.toBeNull();
    const after = appReducer(s, action as NonNullable<typeof action>);
    expect(after.input.dora).toEqual([]);
    expect(after.input.hand).toHaveLength(13);
    expect(after.tenkeyBuffer).toBe('');
  });

  it('D4-C14g-3: tenkey-backspace は dora=バッファ空で末尾1枚・meld=バッファ空で不変・バッファありなら1文字', () => {
    const dora = make({ type: 'dora' }, '', 2);
    expect(appReducer(dora, { type: 'tenkey-backspace' }).input.dora).toEqual([
      t1p
    ]);
    const meld = make({ type: 'meld', i: 0 }, '', 0);
    expect(appReducer(meld, { type: 'tenkey-backspace' })).toBe(meld);
    const withBuf = make({ type: 'dora' }, '12', 2);
    const r = appReducer(withBuf, { type: 'tenkey-backspace' });
    expect(r.tenkeyBuffer).toBe('1');
    expect(r.input.dora).toHaveLength(2);
  });
});
