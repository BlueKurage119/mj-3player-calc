import { describe, expect, it } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import {
  type AppState,
  STEPPER_BOUNDS,
  appReducer,
  createInitialState,
  isNukiEnabled
} from './app-state';

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
      }
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
      }
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
