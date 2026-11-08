import { describe, expect, it } from 'vitest';
import {
  TENKEY_HONOR_HINTS,
  mapTenkeyKey,
  shouldHandleKeyTarget
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
