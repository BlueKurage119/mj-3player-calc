import type { HandOptions, Input } from '../../core/input';
import type { Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile } from '../../core/tile';
import { canAddHandTile, maxHandLength, sortHand } from './hand-rules';

export type Screen = 'main' | 'settings';
export type SheetMode = 'palette' | 'tenkey';
export type TenkeySuit = 'm' | 'p' | 's' | 'z';
export type SheetTarget =
  | { type: 'hand' }
  | { type: 'dora' }
  | { type: 'uradora' }
  | { type: 'meld'; i: number }
  | { type: 'situation' };
export type AppInput = Input & { uradora: Tile[] };
export interface AppState {
  screen: Screen;
  rule: Rule;
  table: Table;
  input: AppInput;
  inputFocus: SheetTarget | null; // null = シートを閉じている
  handOptions: HandOptions;
  tenkeyBuffer: string; // '0'〜'9' のみ。既定 ''
}
export type AppAction =
  | { type: 'navigate'; screen: Screen }
  | { type: 'open-sheet'; target: SheetTarget }
  | { type: 'close-sheet' }
  | { type: 'step'; field: 'continue' | 'deposit' | 'nuki'; delta: 1 | -1 }
  | { type: 'add-hand-tile'; tile: Tile }
  | { type: 'remove-last-hand-tile' }
  | { type: 'remove-hand-tile'; index: number }
  | { type: 'clear-hand' }
  | { type: 'clear-all' }
  | { type: 'set-rule'; rule: Rule }; // D6 が使う。D1 では reducer とテストのみ
export const STEPPER_BOUNDS = {
  continue: [0, 99],
  deposit: [0, 99],
  nuki: [0, 4]
} as const;

const createInitialInput = (): AppInput => ({
  hand: [],
  melds: [],
  dora: [],
  uradora: [],
  nuki: 0
});

const createInitialHandOptions = (): HandOptions => ({
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
});

export const isNukiEnabled = (rule: Rule): boolean => rule.north !== 'yakuhai';

export const createInitialState = (rule: Rule): AppState => ({
  screen: 'main',
  rule,
  table: {
    round: 'east',
    seat: 'east',
    continue: 0,
    deposit: 0
  },
  input: createInitialInput(),
  inputFocus: null,
  handOptions: createInitialHandOptions(),
  tenkeyBuffer: ''
});

export const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'navigate':
      if (state.screen === action.screen) return state;
      return { ...state, screen: action.screen };

    case 'open-sheet': {
      if (state.inputFocus?.type === 'hand' && action.target.type !== 'hand') {
        const sortedHand = sortHand(
          state.input.hand,
          maxHandLength(state.input.melds)
        );
        return {
          ...state,
          input: { ...state.input, hand: sortedHand },
          inputFocus: action.target
        };
      }
      return { ...state, inputFocus: action.target };
    }

    case 'close-sheet': {
      if (state.inputFocus === null) return state;
      if (state.inputFocus.type === 'hand') {
        const sortedHand = sortHand(
          state.input.hand,
          maxHandLength(state.input.melds)
        );
        return {
          ...state,
          input: { ...state.input, hand: sortedHand },
          inputFocus: null
        };
      }
      return { ...state, inputFocus: null };
    }

    case 'add-hand-tile': {
      if (!canAddHandTile(state, action.tile)) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: [...state.input.hand, action.tile]
        }
      };
    }

    case 'remove-last-hand-tile': {
      if (state.input.hand.length === 0) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: state.input.hand.slice(0, -1)
        }
      };
    }

    case 'remove-hand-tile': {
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= state.input.hand.length
      ) {
        return state;
      }
      return {
        ...state,
        input: {
          ...state.input,
          hand: state.input.hand.filter((_, i) => i !== action.index)
        }
      };
    }

    case 'step': {
      const [min, max] = STEPPER_BOUNDS[action.field];
      if (action.field === 'nuki') {
        if (!isNukiEnabled(state.rule)) return state;
        const next = state.input.nuki + action.delta;
        if (next < min || next > max) return state;
        return {
          ...state,
          input: { ...state.input, nuki: next }
        };
      }
      const current = state.table[action.field];
      const next = current + action.delta;
      if (next < min || next > max) return state;
      return {
        ...state,
        table: { ...state.table, [action.field]: next }
      };
    }

    case 'clear-hand':
      return {
        ...state,
        input: { ...state.input, hand: [] }
      };

    case 'clear-all':
      return {
        ...state,
        input: createInitialInput(),
        handOptions: createInitialHandOptions(),
        inputFocus: null
      };

    case 'set-rule': {
      const nextRule = action.rule;
      const nextNuki = isNukiEnabled(nextRule) ? state.input.nuki : 0;
      const nextInput =
        nextNuki === state.input.nuki
          ? state.input
          : { ...state.input, nuki: nextNuki };
      return {
        ...state,
        rule: nextRule,
        input: nextInput
      };
    }
  }
};
