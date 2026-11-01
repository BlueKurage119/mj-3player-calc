import { describe, expect, it } from 'vitest';
import { nextIndex } from './connected-logic';

describe('C2: ConnectedButtonGroup のキー操作ロジック (C2-K01〜K06)', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' }
  ];

  it('C2-K01: ArrowRight / ArrowDown で次へ移動し、末尾では先頭へ巡回する', () => {
    // 次へ移動
    expect(nextIndex(options, 0, 'ArrowRight')).toBe(1);
    expect(nextIndex(options, 1, 'ArrowDown')).toBe(2);
    // 末尾から巡回
    expect(nextIndex(options, 2, 'ArrowRight')).toBe(0);
    expect(nextIndex(options, 2, 'ArrowDown')).toBe(0);
  });

  it('C2-K02: ArrowLeft / ArrowUp で前へ移動し、先頭では末尾へ巡回する', () => {
    // 前へ移動
    expect(nextIndex(options, 2, 'ArrowLeft')).toBe(1);
    expect(nextIndex(options, 1, 'ArrowUp')).toBe(0);
    // 先頭から巡回
    expect(nextIndex(options, 0, 'ArrowLeft')).toBe(2);
    expect(nextIndex(options, 0, 'ArrowUp')).toBe(2);
  });

  it('C2-K03: disabled の選択肢を飛ばして移動する', () => {
    const withDisabled = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
      { value: 'd', label: 'D', disabled: true }
    ];

    // 0 から右 -> 1(disabled)をスキップして 2 へ
    expect(nextIndex(withDisabled, 0, 'ArrowRight')).toBe(2);
    // 2 から右 -> 3(disabled)をスキップして 0 へ巡回
    expect(nextIndex(withDisabled, 2, 'ArrowRight')).toBe(0);

    // 2 から左 -> 1(disabled)をスキップして 0 へ
    expect(nextIndex(withDisabled, 2, 'ArrowLeft')).toBe(0);
    // 0 から左 -> 3(disabled)をスキップして 2 へ巡回
    expect(nextIndex(withDisabled, 0, 'ArrowLeft')).toBe(2);
  });

  it('C2-K04: Home で最初の有効な項目へ移動する', () => {
    const withDisabledFirst = [
      { value: 'a', label: 'A', disabled: true },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' }
    ];

    expect(nextIndex(options, 2, 'Home')).toBe(0);
    // 先頭が無効な場合は最初の有効項目
    expect(nextIndex(withDisabledFirst, 2, 'Home')).toBe(1);
  });

  it('C2-K05: End で最後の有効な項目へ移動する', () => {
    const withDisabledLast = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C', disabled: true }
    ];

    expect(nextIndex(options, 0, 'End')).toBe(2);
    // 末尾が無効な場合は最後の有効項目
    expect(nextIndex(withDisabledLast, 0, 'End')).toBe(1);
  });

  it('C2-K06: 無関係なキー操作では現在値のまま変化しない', () => {
    expect(nextIndex(options, 1, 'Enter')).toBe(1);
    expect(nextIndex(options, 1, 'Space')).toBe(1);
    expect(nextIndex(options, 1, 'Tab')).toBe(1);
    expect(nextIndex(options, 1, 'KeyA')).toBe(1);
  });
});
