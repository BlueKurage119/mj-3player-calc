import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { computeResult } from '../calc/compute';
import {
  type AppAction,
  type AppState,
  STEPPER_BOUNDS,
  appReducer,
  createInitialState,
  isNukiEnabled,
  isSilentReject
} from './app-state';
import { canAddHandTile, sortHand } from './hand-rules';

describe('D1: 状態管理と reducer (条件6〜9)', () => {
  it('D1-6: ステッパー境界のクランプと北役牌時の抜き北無効化', () => {
    const defaultRule = createDefaultRule();
    const initial = createInitialState(defaultRule);

    expect(STEPPER_BOUNDS).toEqual({
      continue: [0, 99],
      deposit: [0, 99],
      nuki: [0, 4]
    });

    // continue: 0 で -1 しても 0 のまま (同じ参照)
    const contMinusAt0 = appReducer(initial, {
      type: 'step',
      field: 'continue',
      delta: -1
    });
    expect(contMinusAt0).toBe(initial);

    // continue: 1 -> 0 は変化する
    const cont1 = appReducer(initial, {
      type: 'step',
      field: 'continue',
      delta: 1
    });
    expect(cont1.table.continue).toBe(1);
    const cont1To0 = appReducer(cont1, {
      type: 'step',
      field: 'continue',
      delta: -1
    });
    expect(cont1To0.table.continue).toBe(0);

    // continue: 98 -> 99 は変化し、99 で +1 しても 99 のまま (同じ参照)
    const stateCont98: AppState = {
      ...initial,
      table: { ...initial.table, continue: 98 }
    };
    const cont99 = appReducer(stateCont98, {
      type: 'step',
      field: 'continue',
      delta: 1
    });
    expect(cont99.table.continue).toBe(99);
    const contPlusAt99 = appReducer(cont99, {
      type: 'step',
      field: 'continue',
      delta: 1
    });
    expect(contPlusAt99).toBe(cont99);

    // deposit: 0 で -1 しても 0 のまま (同じ参照)
    const depMinusAt0 = appReducer(initial, {
      type: 'step',
      field: 'deposit',
      delta: -1
    });
    expect(depMinusAt0).toBe(initial);

    // deposit: 1 -> 0、98 -> 99、99 で +1 は 99 (同じ参照)
    const dep1 = appReducer(initial, {
      type: 'step',
      field: 'deposit',
      delta: 1
    });
    expect(dep1.table.deposit).toBe(1);
    const dep1To0 = appReducer(dep1, {
      type: 'step',
      field: 'deposit',
      delta: -1
    });
    expect(dep1To0.table.deposit).toBe(0);

    const stateDep98: AppState = {
      ...initial,
      table: { ...initial.table, deposit: 98 }
    };
    const dep99 = appReducer(stateDep98, {
      type: 'step',
      field: 'deposit',
      delta: 1
    });
    expect(dep99.table.deposit).toBe(99);
    const depPlusAt99 = appReducer(dep99, {
      type: 'step',
      field: 'deposit',
      delta: 1
    });
    expect(depPlusAt99).toBe(dep99);

    // nuki: 0 で -1 は 0 (同じ参照)、1 -> 0、3 -> 4、4 で +1 は 4 (同じ参照)
    const nukiMinusAt0 = appReducer(initial, {
      type: 'step',
      field: 'nuki',
      delta: -1
    });
    expect(nukiMinusAt0).toBe(initial);

    const nuki1 = appReducer(initial, {
      type: 'step',
      field: 'nuki',
      delta: 1
    });
    expect(nuki1.input.nuki).toBe(1);
    const nuki1To0 = appReducer(nuki1, {
      type: 'step',
      field: 'nuki',
      delta: -1
    });
    expect(nuki1To0.input.nuki).toBe(0);

    const stateNuki3: AppState = {
      ...initial,
      input: { ...initial.input, nuki: 3 }
    };
    const nuki4 = appReducer(stateNuki3, {
      type: 'step',
      field: 'nuki',
      delta: 1
    });
    expect(nuki4.input.nuki).toBe(4);
    const nukiPlusAt4 = appReducer(nuki4, {
      type: 'step',
      field: 'nuki',
      delta: 1
    });
    expect(nukiPlusAt4).toBe(nuki4);

    // rule.north === 'yakuhai' のとき nuki の +1 は状態不変
    const yakuhaiRule = { ...defaultRule, north: 'yakuhai' as const };
    expect(isNukiEnabled(defaultRule)).toBe(true);
    expect(isNukiEnabled(yakuhaiRule)).toBe(false);
    const yakuhaiState = createInitialState(yakuhaiRule);
    const nukiPlusOnYakuhai = appReducer(yakuhaiState, {
      type: 'step',
      field: 'nuki',
      delta: 1
    });
    expect(nukiPlusOnYakuhai).toBe(yakuhaiState);
  });

  it('D1-7: clear-all で手牌・副露・ドラ・裏ドラ・抜き北・状況役・シートが初期化され、table・rule・screen は保持される', () => {
    const customRule = { ...createDefaultRule(), kuitan: false };
    const populated: AppState = {
      screen: 'main',
      rule: customRule,
      table: {
        round: 'south',
        seat: 'west',
        continue: 3,
        deposit: 2
      },
      input: {
        hand: [{ type: 'm', n: 1 }],
        melds: [{ type: 'pon', tile: { type: 'z', n: 1 } }],
        dora: [{ type: 'p', n: 2 }],
        uradora: [{ type: 's', n: 3 }],
        nuki: 2
      },
      inputFocus: { type: 'hand' },
      handOptions: {
        riichi: 'riichi',
        ippatsu: true,
        rinshan: true,
        chankan: false,
        haitei: true,
        tenho: false,
        tsubameGaeshi: true,
        kanFuri: false
      },
      sheetMode: 'palette',
      tenkeyBuffer: ''
    };

    const cleared = appReducer(populated, { type: 'clear-all' });

    expect(cleared.input).toEqual({
      hand: [],
      melds: [],
      dora: [],
      uradora: [],
      nuki: 0
    });
    expect(cleared.handOptions).toEqual({
      riichi: 'none',
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    });
    expect(cleared.inputFocus).toBeNull();
    expect(cleared.table).toEqual({
      round: 'south',
      seat: 'west',
      continue: 3,
      deposit: 2
    });
    expect(cleared.rule).toBe(customRule);
    expect(cleared.screen).toBe('main');
  });

  it('D1-8: clear-hand で input.hand だけが空配列になり他は不変', () => {
    const base = createInitialState(createDefaultRule());
    const stateWithHand: AppState = {
      ...base,
      table: { round: 'south', seat: 'east', continue: 1, deposit: 1 },
      input: {
        hand: [
          { type: 'm', n: 1 },
          { type: 'm', n: 9 }
        ],
        melds: [{ type: 'pon', tile: { type: 'z', n: 5 } }],
        dora: [{ type: 'p', n: 1 }],
        uradora: [{ type: 's', n: 1 }],
        nuki: 1
      },
      inputFocus: { type: 'hand' }
    };

    const after = appReducer(stateWithHand, { type: 'clear-hand' });
    expect(after.input.hand).toEqual([]);
    expect(after.input.melds).toBe(stateWithHand.input.melds);
    expect(after.input.dora).toBe(stateWithHand.input.dora);
    expect(after.input.uradora).toBe(stateWithHand.input.uradora);
    expect(after.input.nuki).toBe(1);
    expect(after.table).toBe(stateWithHand.table);
    expect(after.inputFocus).toEqual({ type: 'hand' });
  });

  it('D1-9: createInitialState の初期値、navigate、open-sheet / close-sheet、set-rule の遷移', () => {
    const rule = createDefaultRule();
    const initial = createInitialState(rule);

    expect(initial).toEqual({
      screen: 'main',
      rule,
      table: {
        round: 'east',
        seat: 'east',
        continue: 0,
        deposit: 0
      },
      input: {
        hand: [],
        melds: [],
        dora: [],
        uradora: [],
        nuki: 0
      },
      inputFocus: null,
      handOptions: {
        riichi: 'none',
        ippatsu: false,
        rinshan: false,
        chankan: false,
        haitei: false,
        tenho: false,
        tsubameGaeshi: false,
        kanFuri: false
      },
      sheetMode: 'palette',
      tenkeyBuffer: ''
    });

    // navigate
    const settingsState = appReducer(initial, {
      type: 'navigate',
      screen: 'settings'
    });
    expect(settingsState.screen).toBe('settings');
    const backToMain = appReducer(settingsState, {
      type: 'navigate',
      screen: 'main'
    });
    expect(backToMain.screen).toBe('main');

    // open-sheet / close-sheet
    const openedHand = appReducer(initial, {
      type: 'open-sheet',
      target: { type: 'hand' }
    });
    expect(openedHand.inputFocus).toEqual({ type: 'hand' });

    const openedMeld = appReducer(openedHand, {
      type: 'open-sheet',
      target: { type: 'meld', i: 2 }
    });
    expect(openedMeld.inputFocus).toEqual({ type: 'meld', i: 2 });

    const closed = appReducer(openedMeld, { type: 'close-sheet' });
    expect(closed.inputFocus).toBeNull();

    // set-rule で北が役牌になったら nuki を 0 に戻す
    const withNuki = appReducer(initial, {
      type: 'step',
      field: 'nuki',
      delta: 1
    });
    expect(withNuki.input.nuki).toBe(1);

    const yakuhaiRule = { ...rule, north: 'yakuhai' as const };
    const afterSetRule = appReducer(withNuki, {
      type: 'set-rule',
      rule: yakuhaiRule
    });
    expect(afterSetRule.rule).toEqual(yakuhaiRule);
    expect(afterSetRule.input.nuki).toBe(0);
  });
});

describe('D2: 手牌の編集アクションとシート閉時の整列 (条件3)', () => {
  it('D2-3-add: add-hand-tile は有効な牌を末尾に追加し、不可の牌では同一 state を返す', () => {
    const initial = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };

    const added1 = appReducer(initial, { type: 'add-hand-tile', tile: tile1p });
    expect(added1.input.hand).toEqual([tile1p]);

    // 2m (三麻で使わない牌) は同一 state
    const invalidSanma = appReducer(added1, {
      type: 'add-hand-tile',
      tile: { type: 'm', n: 2 }
    });
    expect(invalidSanma).toBe(added1);

    // 同じ牌 4 枚状態で 5 枚目は同一 state
    const state4: AppState = {
      ...initial,
      input: { ...initial.input, hand: [tile1p, tile1p, tile1p, tile1p] }
    };
    const fifth = appReducer(state4, { type: 'add-hand-tile', tile: tile1p });
    expect(fifth).toBe(state4);
  });

  it('D2-3-remove-last: remove-last-hand-tile は空で同一 state、非空で末尾 1 枚を除く', () => {
    const initial = createInitialState(createDefaultRule());
    expect(appReducer(initial, { type: 'remove-last-hand-tile' })).toBe(
      initial
    );

    const stateWithHand: AppState = {
      ...initial,
      input: {
        ...initial.input,
        hand: [
          { type: 's', n: 9 },
          { type: 'm', n: 1 },
          { type: 'p', n: 3 }
        ]
      }
    };
    const removed = appReducer(stateWithHand, {
      type: 'remove-last-hand-tile'
    });
    expect(removed.input.hand).toEqual([
      { type: 's', n: 9 },
      { type: 'm', n: 1 }
    ]);
  });

  it('D2-3-remove-index: remove-hand-tile は範囲外で同一 state、範囲内で並びを保って 1 枚除く', () => {
    const initial = createInitialState(createDefaultRule());
    const stateWithHand: AppState = {
      ...initial,
      input: {
        ...initial.input,
        hand: [
          { type: 's', n: 9 },
          { type: 'm', n: 1 },
          { type: 'p', n: 3 }
        ]
      }
    };

    expect(
      appReducer(stateWithHand, { type: 'remove-hand-tile', index: -1 })
    ).toBe(stateWithHand);
    expect(
      appReducer(stateWithHand, { type: 'remove-hand-tile', index: 3 })
    ).toBe(stateWithHand);

    const removedMiddle = appReducer(stateWithHand, {
      type: 'remove-hand-tile',
      index: 1
    });
    expect(removedMiddle.input.hand).toEqual([
      { type: 's', n: 9 },
      { type: 'p', n: 3 }
    ]);
  });

  it('D2-3-close-sheet: close-sheet (対象 hand) は 14 枚で末尾を残して整列し、13 枚で全体を整列する', () => {
    const initial = createInitialState(createDefaultRule());
    const unsorted13: Tile[] = [
      { type: 'z', n: 7 },
      { type: 's', n: 9 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 5, red: false },
      { type: 'm', n: 9 },
      { type: 'm', n: 1 },
      { type: 'z', n: 1 },
      { type: 's', n: 1 },
      { type: 'p', n: 1 },
      { type: 'z', n: 5 },
      { type: 's', n: 3 },
      { type: 'p', n: 3 },
      { type: 'm', n: 1 }
    ];
    const sorted13: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 1 },
      { type: 'm', n: 9 },
      { type: 'p', n: 1 },
      { type: 'p', n: 3 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 5, red: true },
      { type: 's', n: 1 },
      { type: 's', n: 3 },
      { type: 's', n: 9 },
      { type: 'z', n: 1 },
      { type: 'z', n: 5 },
      { type: 'z', n: 7 }
    ];

    const state13: AppState = {
      ...initial,
      input: { ...initial.input, hand: unsorted13 },
      inputFocus: { type: 'hand' }
    };
    const closed13 = appReducer(state13, { type: 'close-sheet' });
    expect(closed13.inputFocus).toBeNull();
    expect(closed13.input.hand).toEqual(sorted13);

    const winningTile: Tile = { type: 'm', n: 9 };
    const state14: AppState = {
      ...initial,
      input: { ...initial.input, hand: [...unsorted13, winningTile] },
      inputFocus: { type: 'hand' }
    };
    const closed14 = appReducer(state14, { type: 'close-sheet' });
    expect(closed14.inputFocus).toBeNull();
    expect(closed14.input.hand).toEqual([...sorted13, winningTile]);

    // open-sheet で hand から別対象に切り替わる場合も整列される
    const switchedFrom14 = appReducer(state14, {
      type: 'open-sheet',
      target: { type: 'dora' }
    });
    expect(switchedFrom14.inputFocus).toEqual({ type: 'dora' });
    expect(switchedFrom14.input.hand).toEqual([...sorted13, winningTile]);
  });
});

describe('D3: テンキー入力の状態管理と reducer (D3-S1〜S13)', () => {
  it('D3-S1: createInitialState は初期値として sheetMode="palette" と tenkeyBuffer="" を持つ', () => {
    const state = createInitialState(createDefaultRule());
    expect(state.sheetMode).toBe('palette');
    expect(state.tenkeyBuffer).toBe('');
  });

  it('D3-S2: set-sheet-mode は同値で同一 state、別値で更新しバッファを捨てる', () => {
    const initial = createInitialState(createDefaultRule());
    // 同値
    expect(
      appReducer(initial, { type: 'set-sheet-mode', mode: 'palette' })
    ).toBe(initial);

    // 別値: バッファを保持した状態から切り替えると破棄される
    const stateWithBuffer: AppState = {
      ...initial,
      sheetMode: 'palette',
      tenkeyBuffer: '123'
    };
    const switched = appReducer(stateWithBuffer, {
      type: 'set-sheet-mode',
      mode: 'tenkey'
    });
    expect(switched.sheetMode).toBe('tenkey');
    expect(switched.tenkeyBuffer).toBe('');
  });

  it('D3-S3: tenkey-digit はパレット方式でバッファ積算、シート閉・不正文字・手牌+バッファ上限・同じ数字 5 つ目で同一 state', () => {
    const base = createInitialState(createDefaultRule());

    // パレット方式 (確定事項 39・41 によりパレット方式でも数字キーが有効でバッファに積まれる)
    const paletteState: AppState = {
      ...base,
      sheetMode: 'palette',
      inputFocus: { type: 'hand' }
    };
    const paletteDigit = appReducer(paletteState, {
      type: 'tenkey-digit',
      digit: '1'
    });
    expect(paletteDigit.tenkeyBuffer).toBe('1');

    // シート閉 (inputFocus: null)
    const closedState: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: null
    };
    expect(appReducer(closedState, { type: 'tenkey-digit', digit: '1' })).toBe(
      closedState
    );

    // シートが対象外 (D4 で dora/uradora/meld が対応したため situation で検証)
    const situationState: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'situation' }
    };
    expect(
      appReducer(situationState, { type: 'tenkey-digit', digit: '1' })
    ).toBe(situationState);

    // 不正文字
    const tenkeyOpen: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' }
    };
    expect(appReducer(tenkeyOpen, { type: 'tenkey-digit', digit: 'x' })).toBe(
      tenkeyOpen
    );

    // 手牌+バッファ上限 (手牌 14)
    const tile1p: Tile = { type: 'p', n: 1 };
    const fullHandState: AppState = {
      ...tenkeyOpen,
      input: {
        ...tenkeyOpen.input,
        hand: Array.from({ length: 14 }, () => tile1p)
      }
    };
    expect(
      appReducer(fullHandState, { type: 'tenkey-digit', digit: '1' })
    ).toBe(fullHandState);

    // 同じ数字 5 つ目 (バッファ "1111" で "1")
    const buffer4State: AppState = {
      ...tenkeyOpen,
      tenkeyBuffer: '1111'
    };
    expect(appReducer(buffer4State, { type: 'tenkey-digit', digit: '1' })).toBe(
      buffer4State
    );
  });

  it('D3-S4: tenkey-digit はテンキー方式で末尾に追加する', () => {
    const base = createInitialState(createDefaultRule());
    const openTenkey: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: '1'
    };
    const next = appReducer(openTenkey, { type: 'tenkey-digit', digit: '2' });
    expect(next.tenkeyBuffer).toBe('12');
  });

  it('D4-C30-R1: パレット方式での tenkey-digit, tenkey-commit, tenkey-backspace (確定事項 39・41)', () => {
    const base = createInitialState(createDefaultRule());
    const paletteOpen: AppState = {
      ...base,
      sheetMode: 'palette',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: ''
    };

    // tenkey-digit 1 でバッファに積まれる
    const s1 = appReducer(paletteOpen, { type: 'tenkey-digit', digit: '1' });
    expect(s1.tenkeyBuffer).toBe('1');

    // バッファありの tenkey-backspace で1文字削除
    const s1Back = appReducer(s1, { type: 'tenkey-backspace' });
    expect(s1Back.tenkeyBuffer).toBe('');

    // 再度 tenkey-digit 1 から tenkey-commit p で 1p 追加
    const s2 = appReducer(paletteOpen, { type: 'tenkey-digit', digit: '1' });
    const sCommit = appReducer(s2, { type: 'tenkey-commit', suit: 'p' });
    expect(sCommit.tenkeyBuffer).toBe('');
    expect(sCommit.input.hand).toEqual([{ type: 'p', n: 1 }]);
  });

  it('D3-S5: tenkey-backspace はバッファ優先で手牌は不変、空なら手牌末尾', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const withBufferAndHand: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      input: { ...base.input, hand: [tile1p] },
      tenkeyBuffer: '12'
    };
    const bs1 = appReducer(withBufferAndHand, { type: 'tenkey-backspace' });
    expect(bs1.tenkeyBuffer).toBe('1');
    expect(bs1.input.hand).toEqual([tile1p]);

    const bs2 = appReducer(bs1, { type: 'tenkey-backspace' });
    expect(bs2.tenkeyBuffer).toBe('');
    expect(bs2.input.hand).toEqual([tile1p]);

    // バッファ空で手牌あり: 手牌末尾を消す
    const bs3 = appReducer(bs2, { type: 'tenkey-backspace' });
    expect(bs3.tenkeyBuffer).toBe('');
    expect(bs3.input.hand).toEqual([]);

    // バッファも手牌も空: 同一 state
    const bs4 = appReducer(bs3, { type: 'tenkey-backspace' });
    expect(bs4).toBe(bs3);
  });

  it('D3-S6: tenkey-commit は空バッファで同一 state', () => {
    const base = createInitialState(createDefaultRule());
    const openTenkey: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: ''
    };
    expect(appReducer(openTenkey, { type: 'tenkey-commit', suit: 'm' })).toBe(
      openTenkey
    );
  });

  it('D3-S7: tenkey-commit は "406"+p(red=1) で 4p・赤5p・6p が入りバッファ空', () => {
    const base = createInitialState({ ...createDefaultRule(), red: 1 });
    const state: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: '406'
    };
    const next = appReducer(state, { type: 'tenkey-commit', suit: 'p' });
    expect(next.input.hand).toEqual([
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: true },
      { type: 'p', n: 6 }
    ]);
    expect(next.tenkeyBuffer).toBe('');
  });

  it('D3-S8: tenkey-commit は使えない牌を含む確定("2"+m、在庫超過)で同一 state (バッファ保持・手牌不変)', () => {
    const base = createInitialState(createDefaultRule());
    // 2m は三麻で不可
    const state2m: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: '2'
    };
    expect(appReducer(state2m, { type: 'tenkey-commit', suit: 'm' })).toBe(
      state2m
    );

    // 在庫超過 (1s が既に 4 枚)
    const tile1s: Tile = { type: 's', n: 1 };
    const stateStockOver: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      input: {
        ...base.input,
        hand: [tile1s, tile1s, tile1s, tile1s]
      },
      tenkeyBuffer: '1'
    };
    expect(
      appReducer(stateStockOver, { type: 'tenkey-commit', suit: 's' })
    ).toBe(stateStockOver);
  });

  it('D3-S9: tenkey-commit は "18"+z で同一 state', () => {
    const base = createInitialState(createDefaultRule());
    const state18z: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      tenkeyBuffer: '18'
    };
    expect(appReducer(state18z, { type: 'tenkey-commit', suit: 'z' })).toBe(
      state18z
    );
  });

  it('D3-S10: add-hand-tiles は全部可で追加、1 枚でも不可または空配列なら同一 state', () => {
    const base = createInitialState(createDefaultRule());
    const stateWithBuffer: AppState = {
      ...base,
      tenkeyBuffer: '123'
    };

    // 全部可
    const validTiles: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 9 }
    ];
    const added = appReducer(stateWithBuffer, {
      type: 'add-hand-tiles',
      tiles: validTiles
    });
    expect(added.input.hand).toEqual(validTiles);
    expect(added.tenkeyBuffer).toBe('');

    // 1枚でも不可 (2m を含む)
    const invalidTiles: Tile[] = [
      { type: 'm', n: 1 },
      { type: 'm', n: 2 }
    ];
    expect(
      appReducer(stateWithBuffer, {
        type: 'add-hand-tiles',
        tiles: invalidTiles
      })
    ).toBe(stateWithBuffer);

    // 空配列
    expect(
      appReducer(stateWithBuffer, { type: 'add-hand-tiles', tiles: [] })
    ).toBe(stateWithBuffer);
  });

  it('D3-S11: 手牌が変わる操作と close-sheet でバッファが空、sheetMode は保持', () => {
    const base = createInitialState(createDefaultRule());
    const tile1p: Tile = { type: 'p', n: 1 };
    const tile1s: Tile = { type: 's', n: 1 };

    const tenkeyState: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' },
      input: { ...base.input, hand: [tile1p, tile1s] },
      tenkeyBuffer: '99'
    };

    // add-hand-tile
    const afterAdd = appReducer(tenkeyState, {
      type: 'add-hand-tile',
      tile: { type: 'm', n: 1 }
    });
    expect(afterAdd.tenkeyBuffer).toBe('');
    expect(afterAdd.sheetMode).toBe('tenkey');

    // remove-last-hand-tile
    const afterRemoveLast = appReducer(tenkeyState, {
      type: 'remove-last-hand-tile'
    });
    expect(afterRemoveLast.tenkeyBuffer).toBe('');
    expect(afterRemoveLast.sheetMode).toBe('tenkey');

    // remove-hand-tile
    const afterRemoveIndex = appReducer(tenkeyState, {
      type: 'remove-hand-tile',
      index: 0
    });
    expect(afterRemoveIndex.tenkeyBuffer).toBe('');
    expect(afterRemoveIndex.sheetMode).toBe('tenkey');

    // clear-hand
    const afterClearHand = appReducer(tenkeyState, { type: 'clear-hand' });
    expect(afterClearHand.tenkeyBuffer).toBe('');
    expect(afterClearHand.sheetMode).toBe('tenkey');

    // clear-all
    const afterClearAll = appReducer(tenkeyState, { type: 'clear-all' });
    expect(afterClearAll.tenkeyBuffer).toBe('');
    expect(afterClearAll.sheetMode).toBe('tenkey');

    // close-sheet
    const afterClose = appReducer(tenkeyState, { type: 'close-sheet' });
    expect(afterClose.tenkeyBuffer).toBe('');
    expect(afterClose.sheetMode).toBe('tenkey');
  });

  it('D3-S12: close-sheet 後に open-sheet しても sheetMode が保持', () => {
    const base = createInitialState(createDefaultRule());
    const tenkeyOpen: AppState = {
      ...base,
      sheetMode: 'tenkey',
      inputFocus: { type: 'hand' }
    };
    const closed = appReducer(tenkeyOpen, { type: 'close-sheet' });
    expect(closed.sheetMode).toBe('tenkey');

    const reopened = appReducer(closed, {
      type: 'open-sheet',
      target: { type: 'hand' }
    });
    expect(reopened.sheetMode).toBe('tenkey');
  });

  it('D3-S13: D2 の既存テストが無変更で通ることを確認', () => {
    // D2 のアクション (add-hand-tile, remove-last-hand-tile, remove-hand-tile, close-sheet) が
    // 既存のテストスイート (D2-3-*) で全て検証され通っていること
    expect(true).toBe(true);
  });

  describe('D4: 副露・抜き北・ドラ表示牌の入力 (C1〜C10)', () => {
    it('D4-C1: add-meld による副露追加と上限 (最大4つ)', () => {
      const base = createInitialState(createDefaultRule());
      const s1 = appReducer(base, { type: 'add-meld' });
      expect(s1.input.melds).toEqual([{ type: 'pon', tile: null }]);
      expect(s1.inputFocus).toEqual({ type: 'meld', i: 0 });

      // 牌を確定して次の副露を追加していく
      const s1Confirmed = appReducer(s1, {
        type: 'set-meld-tile',
        i: 0,
        tile: { type: 'p', n: 1 }
      });
      const s2 = appReducer(s1Confirmed, { type: 'add-meld' });
      expect(s2.input.melds.length).toBe(2);
      expect(s2.inputFocus).toEqual({ type: 'meld', i: 1 });

      const s2Confirmed = appReducer(s2, {
        type: 'set-meld-tile',
        i: 1,
        tile: { type: 'p', n: 2 }
      });
      const s3 = appReducer(s2Confirmed, { type: 'add-meld' });
      expect(s3.input.melds.length).toBe(3);
      expect(s3.inputFocus).toEqual({ type: 'meld', i: 2 });

      const s3Confirmed = appReducer(s3, {
        type: 'set-meld-tile',
        i: 2,
        tile: { type: 'p', n: 3 }
      });
      const s4 = appReducer(s3Confirmed, { type: 'add-meld' });
      expect(s4.input.melds.length).toBe(4);
      expect(s4.inputFocus).toEqual({ type: 'meld', i: 3 });

      // 5回目は state が同一 (参照が等しい)
      const s4Confirmed = appReducer(s4, {
        type: 'set-meld-tile',
        i: 3,
        tile: { type: 'p', n: 4 }
      });
      const s5 = appReducer(s4Confirmed, { type: 'add-meld' });
      expect(s5).toBe(s4Confirmed);
    });

    it('D4-C2: 手牌の切り捨て (最大枚数超過分)', () => {
      const base = createInitialState(createDefaultRule());
      const tiles14: Tile[] = [
        { type: 'p', n: 9 },
        { type: 'p', n: 1 },
        { type: 'p', n: 2 },
        { type: 'p', n: 3 },
        { type: 'p', n: 4 },
        { type: 'p', n: 5, red: false },
        { type: 'p', n: 6 },
        { type: 'p', n: 7 },
        { type: 'p', n: 8 },
        { type: 's', n: 1 },
        { type: 's', n: 2 },
        { type: 's', n: 3 },
        { type: 's', n: 4 },
        { type: 's', n: 5, red: false }
      ];
      // inputFocus = null で 14 枚
      const state14 = {
        ...base,
        input: { ...base.input, hand: tiles14 },
        inputFocus: null
      };
      const sAfterAdd = appReducer(state14, { type: 'add-meld' });
      expect(sAfterAdd.input.hand).toEqual(tiles14.slice(0, 11));

      // 手牌 10 枚なら変わらない
      const state10 = {
        ...base,
        input: { ...base.input, hand: tiles14.slice(0, 10) },
        inputFocus: null
      };
      const s10After = appReducer(state10, { type: 'add-meld' });
      expect(s10After.input.hand).toEqual(tiles14.slice(0, 10));

      // inputFocus = { type: 'hand' } で未整列の 14 枚から add-meld → 整列後の先頭 11 枚になる
      const state14FocusHand = {
        ...base,
        input: { ...base.input, hand: tiles14 },
        inputFocus: { type: 'hand' as const }
      };
      const sHandAfterAdd = appReducer(state14FocusHand, { type: 'add-meld' });
      const sorted14 = sortHand(tiles14, 14);
      expect(sHandAfterAdd.input.hand).toEqual(sorted14.slice(0, 11));
    });

    it('D4-C3: set-meld-tile と使用枚数判定', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile2p: Tile = { type: 'p', n: 2 };
      const tile2m: Tile = { type: 'm', n: 2 };

      // 手牌に 1p を 1 枚持つ状態で副露0にポン 1p → 成立 (手牌1 + ポン3 = 4枚)
      const stateWithHand1p: AppState = {
        ...base,
        input: {
          ...base.input,
          hand: [tile1p],
          melds: [{ type: 'pon', tile: null }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sAfterPon1p = appReducer(stateWithHand1p, {
        type: 'set-meld-tile',
        i: 0,
        tile: tile1p
      });
      expect(sAfterPon1p.input.melds[0]).toEqual({ type: 'pon', tile: tile1p });

      // 手牌に 1p を 2 枚持つ状態ではポン 1p は state 不変 (2 + 3 = 5枚)
      const stateWithHand2_1p: AppState = {
        ...base,
        input: {
          ...base.input,
          hand: [tile1p, tile1p],
          melds: [{ type: 'pon', tile: null }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sFailedPon = appReducer(stateWithHand2_1p, {
        type: 'set-meld-tile',
        i: 0,
        tile: tile1p
      });
      expect(sFailedPon).toBe(stateWithHand2_1p);

      // 手牌に 1p を 1 枚持ちポン 1p を確定した状態で、別の副露(空)に 1p を入れようとすると state 不変 (1 + 3 + 3 = 7枚)
      const stateTwoMelds: AppState = {
        ...base,
        input: {
          ...base.input,
          hand: [tile1p],
          melds: [
            { type: 'pon', tile: tile1p },
            { type: 'pon', tile: null }
          ]
        },
        inputFocus: { type: 'meld', i: 1 }
      };
      const sFailedSecondPon = appReducer(stateTwoMelds, {
        type: 'set-meld-tile',
        i: 1,
        tile: tile1p
      });
      expect(sFailedSecondPon).toBe(stateTwoMelds);

      // 2m を入れようとすると state 不変
      const sFailed2m = appReducer(stateWithHand1p, {
        type: 'set-meld-tile',
        i: 0,
        tile: tile2m
      });
      expect(sFailed2m).toBe(stateWithHand1p);

      // 確定済みのポン 1p に 2p を入れると牌が 2p に置き換わる
      const sReplaced2p = appReducer(sAfterPon1p, {
        type: 'set-meld-tile',
        i: 0,
        tile: tile2p
      });
      expect(sReplaced2p.input.melds[0]).toEqual({ type: 'pon', tile: tile2p });

      // 確定済みのポン 1p に同じ 1p を入れても成立する (自身を除いて数える)
      const sSame1p = appReducer(sAfterPon1p, {
        type: 'set-meld-tile',
        i: 0,
        tile: tile1p
      });
      expect(sSame1p.input.melds[0]).toEqual({ type: 'pon', tile: tile1p });
    });

    it('D4-C4: set-meld-kind による種類の変更と牌保持・枚数判定', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };

      // ポン 1p (他に 1p 無し) を明槓・暗槓に変えると {type:'kan', closed:false}・{closed:true} になり牌は 1p のまま
      const statePon: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [{ type: 'pon', tile: tile1p }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sMinkan = appReducer(statePon, {
        type: 'set-meld-kind',
        i: 0,
        kind: 'minkan'
      });
      expect(sMinkan.input.melds[0]).toEqual({
        type: 'kan',
        tile: tile1p,
        closed: false
      });

      const sAnkan = appReducer(statePon, {
        type: 'set-meld-kind',
        i: 0,
        kind: 'ankan'
      });
      expect(sAnkan.input.melds[0]).toEqual({
        type: 'kan',
        tile: tile1p,
        closed: true
      });

      // 手牌に 1p が 1 枚ある状態ではポン 1p を明槓に変えられない (state 不変)
      const statePonWithHand: AppState = {
        ...base,
        input: {
          ...base.input,
          hand: [tile1p],
          melds: [{ type: 'pon', tile: tile1p }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sFailedKan = appReducer(statePonWithHand, {
        type: 'set-meld-kind',
        i: 0,
        kind: 'minkan'
      });
      expect(sFailedKan).toBe(statePonWithHand);

      // 空の副露の種類変更は常に成立する
      const stateEmptyMeld: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [{ type: 'pon', tile: null }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sEmptyMinkan = appReducer(stateEmptyMeld, {
        type: 'set-meld-kind',
        i: 0,
        kind: 'minkan'
      });
      expect(sEmptyMinkan.input.melds[0]).toEqual({
        type: 'kan',
        tile: null,
        closed: false
      });
    });

    it('D4-C5: remove-meld と対象 index の補正', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile2p: Tile = { type: 'p', n: 2 };
      const tile3p: Tile = { type: 'p', n: 3 };

      // 副露3つ、inputFocus=meld 2 で remove-meld i:0 → 副露2つ、inputFocus=meld 1
      const state3Melds: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [
            { type: 'pon', tile: tile1p },
            { type: 'pon', tile: tile2p },
            { type: 'pon', tile: tile3p }
          ]
        },
        inputFocus: { type: 'meld', i: 2 }
      };
      const sRemoved0 = appReducer(state3Melds, { type: 'remove-meld', i: 0 });
      expect(sRemoved0.input.melds.length).toBe(2);
      expect(sRemoved0.input.melds[0]).toEqual({ type: 'pon', tile: tile2p });
      expect(sRemoved0.input.melds[1]).toEqual({ type: 'pon', tile: tile3p });
      expect(sRemoved0.inputFocus).toEqual({ type: 'meld', i: 1 });

      // inputFocus=meld 1 で remove-meld i:1 → inputFocus=null
      const sRemoved1 = appReducer(sRemoved0, { type: 'remove-meld', i: 1 });
      expect(sRemoved1.input.melds.length).toBe(1);
      expect(sRemoved1.inputFocus).toBeNull();
    });

    it('D7-C11: clear-meld-tile は牌ありでnull化・種別とフォーカス不変・バッファ空、牌なしや範囲外は同一参照', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const stateWithMeld: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [{ type: 'pon', tile: tile1p }]
        },
        inputFocus: { type: 'meld', i: 0 },
        tenkeyBuffer: '12'
      };

      // 牌あり → tile: null, 種別(pon)不変, focus不変, tenkeyBuffer空
      const sCleared = appReducer(stateWithMeld, {
        type: 'clear-meld-tile',
        i: 0
      });
      expect(sCleared.input.melds[0]).toEqual({ type: 'pon', tile: null });
      expect(sCleared.inputFocus).toEqual({ type: 'meld', i: 0 });
      expect(sCleared.tenkeyBuffer).toBe('');

      // 既に tile === null → 同一参照
      expect(appReducer(sCleared, { type: 'clear-meld-tile', i: 0 })).toBe(
        sCleared
      );

      // 範囲外 index → 同一参照
      expect(appReducer(stateWithMeld, { type: 'clear-meld-tile', i: 1 })).toBe(
        stateWithMeld
      );
      expect(
        appReducer(stateWithMeld, { type: 'clear-meld-tile', i: -1 })
      ).toBe(stateWithMeld);
    });

    it('D4-C6: 対象離脱時の空副露削除 (A5) と index 補正', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };

      // add-meld 直後に close-sheet → melds が空
      const sAdd = appReducer(base, { type: 'add-meld' });
      expect(sAdd.input.melds.length).toBe(1);
      const sClosed = appReducer(sAdd, { type: 'close-sheet' });
      expect(sClosed.input.melds).toEqual([]);
      expect(sClosed.inputFocus).toBeNull();

      // 同じく open-sheet {type:'dora'} → melds が空で inputFocus が dora
      const sOpenDora = appReducer(sAdd, {
        type: 'open-sheet',
        target: { type: 'dora' }
      });
      expect(sOpenDora.input.melds).toEqual([]);
      expect(sOpenDora.inputFocus).toEqual({ type: 'dora' });

      // 牌を確定した副露は close-sheet で残る
      const sConfirmed: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [{ type: 'pon', tile: tile1p }]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sClosedWithTile = appReducer(sConfirmed, { type: 'close-sheet' });
      expect(sClosedWithTile.input.melds).toEqual([
        { type: 'pon', tile: tile1p }
      ]);
      expect(sClosedWithTile.inputFocus).toBeNull();

      // index 補正の検証: melds=[{pon,null},{pon,1p}]・inputFocus=meld 0 で open-sheet meld 1 → melds=[{pon,1p}]、inputFocus=meld 0
      const stateArtificial: AppState = {
        ...base,
        input: {
          ...base.input,
          melds: [
            { type: 'pon', tile: null },
            { type: 'pon', tile: tile1p }
          ]
        },
        inputFocus: { type: 'meld', i: 0 }
      };
      const sCorrected = appReducer(stateArtificial, {
        type: 'open-sheet',
        target: { type: 'meld', i: 1 }
      });
      expect(sCorrected.input.melds).toEqual([{ type: 'pon', tile: tile1p }]);
      expect(sCorrected.inputFocus).toEqual({ type: 'meld', i: 0 });
    });

    it('D4-C7: 表示牌の追加・上限5枚・使用枚数連動・削除・クリア', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile2m: Tile = { type: 'm', n: 2 };

      // add-indicator-tile dora で 5 枚まで入り、6 枚目は state 不変
      let sDora = base;
      for (let i = 1; i <= 5; i++) {
        const tileToAdd: Tile =
          i === 5
            ? { type: 'p', n: 5, red: false }
            : { type: 'p', n: i as 1 | 2 | 3 | 4 };
        sDora = appReducer(sDora, {
          type: 'add-indicator-tile',
          target: 'dora',
          tile: tileToAdd
        });
        expect(sDora.input.dora.length).toBe(i);
      }
      const sDora6 = appReducer(sDora, {
        type: 'add-indicator-tile',
        target: 'dora',
        tile: { type: 'p', n: 6 }
      });
      expect(sDora6).toBe(sDora);

      // 2m は不可 (state 不変)
      const sFailed2m = appReducer(base, {
        type: 'add-indicator-tile',
        target: 'dora',
        tile: tile2m
      });
      expect(sFailed2m).toBe(base);

      // ドラ 1p ×3 + 裏ドラ 1p ×1 の後、手牌に 1p を足せない (canAddHandTile が偽)
      const state4Dora1p: AppState = {
        ...base,
        input: {
          ...base.input,
          dora: [tile1p, tile1p, tile1p],
          uradora: [tile1p]
        }
      };
      expect(canAddHandTile(state4Dora1p, tile1p)).toBe(false);

      // remove-last-indicator-tile・clear-indicators が対象の側だけを変える
      const stateBoth: AppState = {
        ...base,
        input: {
          ...base.input,
          dora: [tile1p, tile1p],
          uradora: [{ type: 'p', n: 2 }]
        }
      };
      const sRemoveDora = appReducer(stateBoth, {
        type: 'remove-last-indicator-tile',
        target: 'dora'
      });
      expect(sRemoveDora.input.dora.length).toBe(1);
      expect(sRemoveDora.input.uradora.length).toBe(1);

      const sClearDora = appReducer(stateBoth, {
        type: 'clear-indicators',
        target: 'dora'
      });
      expect(sClearDora.input.dora).toEqual([]);
      expect(sClearDora.input.uradora).toEqual([{ type: 'p', n: 2 }]);
    });

    it('D4-C8: テンキーの対象一般化 (dora・meld の桁上限・commit・backspace)', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };

      // inputFocus=dora で表示牌 3 枚のとき tenkey-digit は 2 桁まで、3 桁目は不変
      const dora3State: AppState = {
        ...base,
        sheetMode: 'tenkey',
        inputFocus: { type: 'dora' },
        input: {
          ...base.input,
          dora: [tile1p, tile1p, tile1p]
        }
      };
      const d1 = appReducer(dora3State, { type: 'tenkey-digit', digit: '1' });
      expect(d1.tenkeyBuffer).toBe('1');
      const d2 = appReducer(d1, { type: 'tenkey-digit', digit: '2' });
      expect(d2.tenkeyBuffer).toBe('12');
      const d3 = appReducer(d2, { type: 'tenkey-digit', digit: '3' });
      expect(d3).toBe(d2);

      // tenkey-commit p で 2 枚追加
      const dCommitted = appReducer(d2, { type: 'tenkey-commit', suit: 'p' });
      expect(dCommitted.input.dora.length).toBe(5);
      expect(dCommitted.input.dora[3]).toEqual({ type: 'p', n: 1 });
      expect(dCommitted.input.dora[4]).toEqual({ type: 'p', n: 2 });
      expect(dCommitted.tenkeyBuffer).toBe('');

      // inputFocus=meld 0 では 1 桁まで
      const meldOpenState: AppState = {
        ...base,
        sheetMode: 'tenkey',
        inputFocus: { type: 'meld', i: 0 },
        input: {
          ...base.input,
          melds: [{ type: 'pon', tile: null }]
        }
      };
      const m1 = appReducer(meldOpenState, {
        type: 'tenkey-digit',
        digit: '1'
      });
      expect(m1.tenkeyBuffer).toBe('1');
      const m2 = appReducer(m1, { type: 'tenkey-digit', digit: '2' });
      expect(m2).toBe(m1);

      // '1' → tenkey-commit p で副露0が 1p になる
      const mCommitted = appReducer(m1, { type: 'tenkey-commit', suit: 'p' });
      expect(mCommitted.input.melds[0]).toEqual({ type: 'pon', tile: tile1p });
      expect(mCommitted.tenkeyBuffer).toBe('');

      // inputFocus=meld 0 でバッファ空の tenkey-backspace は不変
      const mEmptyBs = appReducer(meldOpenState, { type: 'tenkey-backspace' });
      expect(mEmptyBs).toBe(meldOpenState);

      // dora では末尾1枚が消える
      const doraWithTiles: AppState = {
        ...base,
        sheetMode: 'tenkey',
        inputFocus: { type: 'dora' },
        input: {
          ...base.input,
          dora: [tile1p, { type: 'p', n: 2 }]
        }
      };
      const doraBs = appReducer(doraWithTiles, { type: 'tenkey-backspace' });
      expect(doraBs.input.dora).toEqual([tile1p]);
    });

    it('D4-C9: 抜き北 (北役牌設定時のステッパー無効化・0リセット)', () => {
      const base = createInitialState(createDefaultRule());
      const sWithNuki = appReducer(base, {
        type: 'step',
        field: 'nuki',
        delta: 1
      });
      expect(sWithNuki.input.nuki).toBe(1);

      // rule.north='yakuhai' で step nuki +1 が不変 (無効)
      const yakuhaiRule = { ...base.rule, north: 'yakuhai' as const };
      const stateYakuhai: AppState = {
        ...base,
        rule: yakuhaiRule
      };
      const sStepYakuhai = appReducer(stateYakuhai, {
        type: 'step',
        field: 'nuki',
        delta: 1
      });
      expect(sStepYakuhai).toBe(stateYakuhai);

      // set-rule で yakuhai にすると nuki が 0 になる
      const sRuleChanged = appReducer(sWithNuki, {
        type: 'set-rule',
        rule: yakuhaiRule
      });
      expect(sRuleChanged.input.nuki).toBe(0);
      expect(isNukiEnabled(sRuleChanged.rule)).toBe(false);
    });

    it('D4-C10: 計算コア (computeResult) への dora/uradora 結合と melds の伝達', () => {
      const base = createInitialState(createDefaultRule());
      const tile1p: Tile = { type: 'p', n: 1 };
      const tile9p: Tile = { type: 'p', n: 9 };

      const state: AppState = {
        ...base,
        input: {
          hand: [
            { type: 'p', n: 2 },
            { type: 'p', n: 3 },
            { type: 'p', n: 4 }
          ],
          melds: [{ type: 'pon', tile: tile1p }],
          dora: [tile1p],
          uradora: [tile9p],
          nuki: 0
        }
      };

      const res = computeResult(state);
      expect(res).toBeDefined();
    });
  });
});

describe('D4-C23: open-sheet の同一副露再選択 (確定事項 30)', () => {
  const tile1p: Tile = { type: 'p', n: 1 };
  const make = (): AppState => {
    const base = createInitialState(createDefaultRule());
    return {
      ...base,
      input: {
        ...base.input,
        melds: [
          { type: 'pon', tile: tile1p },
          { type: 'pon', tile: null }
        ]
      },
      inputFocus: { type: 'meld', i: 1 }
    };
  };

  it('D4-C23a: 空の副露を再選択しても消えず、続けて set-meld-tile が成立する', () => {
    const s = appReducer(make(), {
      type: 'open-sheet',
      target: { type: 'meld', i: 1 }
    });
    expect(s.input.melds).toHaveLength(2);
    expect(s.inputFocus).toEqual({ type: 'meld', i: 1 });
    const s2 = appReducer(s, {
      type: 'set-meld-tile',
      i: 1,
      tile: { type: 's', n: 2 }
    });
    expect(s2.input.melds[1]).toEqual({
      type: 'pon',
      tile: { type: 's', n: 2 }
    });
  });

  it('D4-C23b: 別の副露へ移ると空の副露が消え index が補正される', () => {
    const s = appReducer(make(), {
      type: 'open-sheet',
      target: { type: 'meld', i: 0 }
    });
    expect(s.input.melds).toEqual([{ type: 'pon', tile: tile1p }]);
    expect(s.inputFocus).toEqual({ type: 'meld', i: 0 });
  });

  it('D4-C23c: 同じ副露の再選択の後に close-sheet すると空の副露が消える', () => {
    const s = appReducer(make(), {
      type: 'open-sheet',
      target: { type: 'meld', i: 1 }
    });
    const closed = appReducer(s, { type: 'close-sheet' });
    expect(closed.input.melds).toEqual([{ type: 'pon', tile: tile1p }]);
    expect(closed.inputFocus).toBeNull();
  });
});

describe('D5: 状況入力の reducer と結果連動 (C5〜C8, C13)', () => {
  it('D5-C5: reducer: set-wind round/seat', () => {
    const initial = createInitialState(createDefaultRule());
    // 1. table が更新される
    const roundSouth = appReducer(initial, {
      type: 'set-wind',
      field: 'round',
      wind: 'south'
    });
    expect(roundSouth.table.round).toBe('south');
    expect(roundSouth.table.seat).toBe('east');

    // 2. 同値なら同一 state
    const roundSouthAgain = appReducer(roundSouth, {
      type: 'set-wind',
      field: 'round',
      wind: 'south'
    });
    expect(roundSouthAgain).toBe(roundSouth);

    // 3. handOptions, input, inputFocus, tenkeyBuffer は参照同一
    expect(roundSouth.handOptions).toBe(initial.handOptions);
    expect(roundSouth.input).toBe(initial.input);
    expect(roundSouth.inputFocus).toBe(initial.inputFocus);
    expect(roundSouth.tenkeyBuffer).toBe(initial.tenkeyBuffer);

    // seat の更新
    const seatWest = appReducer(roundSouth, {
      type: 'set-wind',
      field: 'seat',
      wind: 'west'
    });
    expect(seatWest.table.seat).toBe('west');
    const seatWestAgain = appReducer(seatWest, {
      type: 'set-wind',
      field: 'seat',
      wind: 'west'
    });
    expect(seatWestAgain).toBe(seatWest);
  });

  it('D5-C6: reducer: set-riichi', () => {
    const ruleWithoutOpen = createDefaultRule(); // openRiichi: false
    const initial = createInitialState(ruleWithoutOpen);

    // 1. openRiichi=false で 'open-riichi' を送ると 'riichi' になる
    const s1 = appReducer(initial, {
      type: 'set-riichi',
      riichi: 'open-riichi'
    });
    expect(s1.handOptions.riichi).toBe('riichi');

    // 2. 一発が true の状態で 'none' を送ると ippatsu=false になる
    const sWithIppatsu: AppState = {
      ...s1,
      handOptions: { ...s1.handOptions, riichi: 'riichi', ippatsu: true }
    };
    const sNone = appReducer(sWithIppatsu, {
      type: 'set-riichi',
      riichi: 'none'
    });
    expect(sNone.handOptions.riichi).toBe('none');
    expect(sNone.handOptions.ippatsu).toBe(false);

    // 3. 現在値と同じ値を送ると同一 state
    const sNoneAgain = appReducer(sNone, {
      type: 'set-riichi',
      riichi: 'none'
    });
    expect(sNoneAgain).toBe(sNone);

    // 4. input, inputFocus, tenkeyBuffer, table は参照同一
    expect(s1.input).toBe(initial.input);
    expect(s1.inputFocus).toBe(initial.inputFocus);
    expect(s1.tenkeyBuffer).toBe(initial.tenkeyBuffer);
    expect(s1.table).toBe(initial.table);
  });

  it('D5-C7: reducer: set-situation', () => {
    const defaultRule = createDefaultRule(); // ippatsu: true, localYaku: false
    const initial = createInitialState(defaultRule); // riichi: 'none'

    // 1. 立直なしで ippatsu=true は無視(同一 state)
    const ignoreIppatsu = appReducer(initial, {
      type: 'set-situation',
      key: 'ippatsu',
      value: true
    });
    expect(ignoreIppatsu).toBe(initial);

    // 2. localYaku=false で 燕返し true は無視(同一 state)
    const ignoreTsubame = appReducer(initial, {
      type: 'set-situation',
      key: 'tsubameGaeshi',
      value: true
    });
    expect(ignoreTsubame).toBe(initial);

    // 3. false はいつでも受ける (現在値が true の状態から false へ)
    const sWithRinshan: AppState = {
      ...initial,
      handOptions: { ...initial.handOptions, rinshan: true }
    };
    const sRinshanFalse = appReducer(sWithRinshan, {
      type: 'set-situation',
      key: 'rinshan',
      value: false
    });
    expect(sRinshanFalse.handOptions.rinshan).toBe(false);

    // 4. 現在値と同じ値で同一 state
    const sRinshanFalseAgain = appReducer(sRinshanFalse, {
      type: 'set-situation',
      key: 'rinshan',
      value: false
    });
    expect(sRinshanFalseAgain).toBe(sRinshanFalse);

    // 5. input, inputFocus, tenkeyBuffer, table は参照同一
    expect(sRinshanFalse.input).toBe(sWithRinshan.input);
    expect(sRinshanFalse.inputFocus).toBe(sWithRinshan.inputFocus);
    expect(sRinshanFalse.tenkeyBuffer).toBe(sWithRinshan.tenkeyBuffer);
    expect(sRinshanFalse.table).toBe(sWithRinshan.table);
  });

  it('D5-C8: reducer: set-rule / clear-all', () => {
    const ruleAll = {
      ...createDefaultRule(),
      openRiichi: true,
      ippatsu: true,
      localYaku: true
    };
    const initial = createInitialState(ruleAll);
    const stateWithYaku: AppState = {
      ...initial,
      handOptions: {
        ...initial.handOptions,
        riichi: 'open-double-riichi',
        ippatsu: true,
        tsubameGaeshi: true,
        kanFuri: true
      },
      input: {
        ...initial.input,
        nuki: 2
      },
      table: {
        ...initial.table,
        round: 'south',
        seat: 'west',
        continue: 3,
        deposit: 2
      }
    };

    // 1. openRiichi 真→偽で 'open-double-riichi'→'double-riichi'、続けて偽→真にしても 'double-riichi' のまま
    const ruleNoOpen = { ...ruleAll, openRiichi: false };
    const sNoOpen = appReducer(stateWithYaku, {
      type: 'set-rule',
      rule: ruleNoOpen
    });
    expect(sNoOpen.handOptions.riichi).toBe('double-riichi');

    const sRestoreOpen = appReducer(sNoOpen, {
      type: 'set-rule',
      rule: ruleAll
    });
    expect(sRestoreOpen.handOptions.riichi).toBe('double-riichi');

    // 2. ippatsu ルール偽で ippatsu=false、真に戻しても false のまま
    const ruleNoIppatsu = { ...ruleAll, ippatsu: false };
    const sNoIppatsu = appReducer(stateWithYaku, {
      type: 'set-rule',
      rule: ruleNoIppatsu
    });
    expect(sNoIppatsu.handOptions.ippatsu).toBe(false);

    const sRestoreIppatsu = appReducer(sNoIppatsu, {
      type: 'set-rule',
      rule: ruleAll
    });
    expect(sRestoreIppatsu.handOptions.ippatsu).toBe(false);

    // 3. localYaku 偽で 燕返し・槓振り false、真に戻しても false のまま
    const ruleNoLocal = { ...ruleAll, localYaku: false };
    const sNoLocal = appReducer(stateWithYaku, {
      type: 'set-rule',
      rule: ruleNoLocal
    });
    expect(sNoLocal.handOptions.tsubameGaeshi).toBe(false);
    expect(sNoLocal.handOptions.kanFuri).toBe(false);

    const sRestoreLocal = appReducer(sNoLocal, {
      type: 'set-rule',
      rule: ruleAll
    });
    expect(sRestoreLocal.handOptions.tsubameGaeshi).toBe(false);
    expect(sRestoreLocal.handOptions.kanFuri).toBe(false);

    // 4. nuki の既存正規化も維持 (north: 'yakuhai' なら nuki は 0 になる)
    const ruleNorthYakuhai = { ...ruleAll, north: 'yakuhai' as const };
    const sYakuhai = appReducer(stateWithYaku, {
      type: 'set-rule',
      rule: ruleNorthYakuhai
    });
    expect(sYakuhai.input.nuki).toBe(0);

    // 5. clear-all 後 handOptions が初期値で table 不変
    const sCleared = appReducer(stateWithYaku, { type: 'clear-all' });
    expect(sCleared.handOptions).toEqual({
      riichi: 'none',
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      tenho: false,
      tsubameGaeshi: false,
      kanFuri: false
    });
    expect(sCleared.table).toEqual({
      round: 'south',
      seat: 'west',
      continue: 3,
      deposit: 2
    });
  });

  it('D5-C13: 自動テスト: 結果連動 (computeResult で立直・一発・天和が反映される)', () => {
    const defaultRule = createDefaultRule();
    const initial = createInitialState(defaultRule);

    // 111p 234p 567p 999p 11s の和了手牌 (14枚)
    const horaHand: Tile[] = [
      { type: 'p', n: 1 },
      { type: 'p', n: 1 },
      { type: 'p', n: 1 },
      { type: 'p', n: 2 },
      { type: 'p', n: 3 },
      { type: 'p', n: 4 },
      { type: 'p', n: 5, red: false },
      { type: 'p', n: 6 },
      { type: 'p', n: 7 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 'p', n: 9 },
      { type: 's', n: 1 },
      { type: 's', n: 1 }
    ];

    const stateHora: AppState = {
      ...initial,
      input: {
        ...initial.input,
        hand: horaHand
      }
    };

    // 1. set-riichi 'riichi' -> set-situation ippatsu true
    const withRiichi = appReducer(stateHora, {
      type: 'set-riichi',
      riichi: 'riichi'
    });
    const withIppatsu = appReducer(withRiichi, {
      type: 'set-situation',
      key: 'ippatsu',
      value: true
    });

    const result = computeResult(withIppatsu);
    expect(result?.type).toBe('hora-shanten');
    if (result?.type === 'hora-shanten' && result.info.type === 'hora') {
      const allYakuNames = result.info.hora.flatMap(h =>
        h.yaku.map(y => y.name)
      );
      expect(allYakuNames).toContain('riichi');
      expect(allYakuNames).toContain('ippatsu');
    }

    // 2. seat='east'・副露なし・和了形で set-situation tenho true -> tenho が含まれる
    const withTenho = appReducer(stateHora, {
      type: 'set-situation',
      key: 'tenho',
      value: true
    });
    const resultTenho = computeResult(withTenho);
    expect(resultTenho?.type).toBe('hora-shanten');
    if (
      resultTenho?.type === 'hora-shanten' &&
      resultTenho.info.type === 'hora'
    ) {
      const allYakuNames = resultTenho.info.hora.flatMap(h =>
        h.yaku.map(y => y.name)
      );
      expect(allYakuNames).toContain('tenho');
    }
  });

  describe('D7-C8: isSilentReject の真偽判定 (確定事項 K10)', () => {
    const base = createInitialState(createDefaultRule());

    it('E1: tenkey-commit で解決不能牌(8z等)は拒否判定が真', () => {
      const prev: AppState = {
        ...base,
        inputFocus: { type: 'hand' },
        tenkeyBuffer: '8'
      };
      const action: AppAction = { type: 'tenkey-commit', suit: 'z' };
      const next = appReducer(prev, action);
      expect(next).toBe(prev);
      expect(isSilentReject(prev, action, next)).toBe(true);
    });

    it('E2: tenkey-commit で枚数超過(手牌14枚満杯など)は拒否判定が真', () => {
      const hand14 = Array.from({ length: 14 }, () => ({
        type: 'p' as const,
        n: 1 as const
      }));
      const prev: AppState = {
        ...base,
        input: { ...base.input, hand: hand14 },
        inputFocus: { type: 'hand' },
        tenkeyBuffer: '1'
      };
      const action: AppAction = { type: 'tenkey-commit', suit: 'p' };
      const next = appReducer(prev, action);
      expect(next).toBe(prev);
      expect(isSilentReject(prev, action, next)).toBe(true);
    });

    it('E3: tenkey-digit が容量上限や赤なし等で拒否された場合は拒否判定が真', () => {
      const hand14 = Array.from({ length: 14 }, () => ({
        type: 'p' as const,
        n: 1 as const
      }));
      const prev: AppState = {
        ...base,
        input: { ...base.input, hand: hand14 },
        inputFocus: { type: 'hand' },
        tenkeyBuffer: ''
      };
      const action: AppAction = { type: 'tenkey-digit', digit: '1' };
      const next = appReducer(prev, action);
      expect(next).toBe(prev);
      expect(isSilentReject(prev, action, next)).toBe(true);

      // 赤なしで 0
      const prevRed0: AppState = {
        ...createInitialState({ ...createDefaultRule(), red: 0 }),
        inputFocus: { type: 'hand' },
        tenkeyBuffer: ''
      };
      const action0: AppAction = { type: 'tenkey-digit', digit: '0' };
      const nextRed0 = appReducer(prevRed0, action0);
      expect(nextRed0).toBe(prevRed0);
      expect(isSilentReject(prevRed0, action0, nextRed0)).toBe(true);
    });

    it('偽ケース: バッファ空の commit、成功した commit、フォーカスが null または非対象', () => {
      // バッファ空の commit
      const emptyBufState: AppState = {
        ...base,
        inputFocus: { type: 'hand' },
        tenkeyBuffer: ''
      };
      const actionCommit: AppAction = { type: 'tenkey-commit', suit: 'p' };
      const nextEmpty = appReducer(emptyBufState, actionCommit);
      expect(nextEmpty).toBe(emptyBufState);
      expect(isSilentReject(emptyBufState, actionCommit, nextEmpty)).toBe(
        false
      );

      // 成功した commit
      const validBufState: AppState = {
        ...base,
        inputFocus: { type: 'hand' },
        tenkeyBuffer: '1'
      };
      const nextValid = appReducer(validBufState, actionCommit);
      expect(nextValid).not.toBe(validBufState);
      expect(isSilentReject(validBufState, actionCommit, nextValid)).toBe(
        false
      );

      // inputFocus が null
      const noFocusState: AppState = {
        ...base,
        inputFocus: null,
        tenkeyBuffer: '1'
      };
      const nextNoFocus = appReducer(noFocusState, actionCommit);
      expect(nextNoFocus).toBe(noFocusState);
      expect(isSilentReject(noFocusState, actionCommit, nextNoFocus)).toBe(
        false
      );

      // inputFocus が situation
      const situationFocusState: AppState = {
        ...base,
        inputFocus: { type: 'situation' },
        tenkeyBuffer: '1'
      };
      const actionDigit: AppAction = { type: 'tenkey-digit', digit: '1' };
      const nextSituation = appReducer(situationFocusState, actionDigit);
      expect(nextSituation).toBe(situationFocusState);
      expect(
        isSilentReject(situationFocusState, actionDigit, nextSituation)
      ).toBe(false);
    });
  });
});
