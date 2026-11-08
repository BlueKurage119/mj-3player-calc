import type { HandOptions, Input } from '../../core/input';
import type { Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile } from '../../core/tile';
import {
  canAddHandTile,
  canAppendTenkeyDigit,
  maxHandLength,
  planAddTiles,
  resolveTenkeyBuffer,
  sortHand
} from './hand-rules';

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
  sheetMode: SheetMode; // 既定 'palette'。開閉をまたいで保持
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
  | { type: 'set-rule'; rule: Rule } // D6 が使う。D1 では reducer とテストのみ
  | { type: 'set-sheet-mode'; mode: SheetMode }
  | { type: 'tenkey-digit'; digit: string } // '0'〜'9' の 1 文字
  | { type: 'tenkey-backspace' }
  | { type: 'tenkey-commit'; suit: TenkeySuit }
  | { type: 'add-hand-tiles'; tiles: Tile[] };
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
  sheetMode: 'palette',
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
          inputFocus: action.target,
          tenkeyBuffer: ''
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
          inputFocus: null,
          tenkeyBuffer: ''
        };
      }
      return { ...state, inputFocus: null, tenkeyBuffer: '' };
    }

    case 'add-hand-tile': {
      if (!canAddHandTile(state, action.tile)) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: [...state.input.hand, action.tile]
        },
        tenkeyBuffer: ''
      };
    }

    case 'remove-last-hand-tile': {
      if (state.input.hand.length === 0) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: state.input.hand.slice(0, -1)
        },
        tenkeyBuffer: ''
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
        },
        tenkeyBuffer: ''
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
        input: { ...state.input, hand: [] },
        tenkeyBuffer: ''
      };

    case 'clear-all':
      return {
        ...state,
        input: createInitialInput(),
        handOptions: createInitialHandOptions(),
        inputFocus: null,
        tenkeyBuffer: ''
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

    case 'set-sheet-mode': {
      if (state.sheetMode === action.mode) return state;
      return {
        ...state,
        sheetMode: action.mode,
        tenkeyBuffer: ''
      };
    }

    case 'tenkey-digit': {
      if (state.inputFocus?.type !== 'hand') return state;
      if (state.sheetMode !== 'tenkey') return state;
      if (!canAppendTenkeyDigit(state, action.digit)) return state;
      return {
        ...state,
        tenkeyBuffer: state.tenkeyBuffer + action.digit
      };
    }

    case 'tenkey-backspace': {
      if (state.tenkeyBuffer.length > 0) {
        return {
          ...state,
          tenkeyBuffer: state.tenkeyBuffer.slice(0, -1)
        };
      }
      if (state.input.hand.length === 0) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: state.input.hand.slice(0, -1)
        },
        tenkeyBuffer: ''
      };
    }

    case 'tenkey-commit': {
      const tiles = resolveTenkeyBuffer(state.tenkeyBuffer, action.suit);
      if (tiles === null) return state;
      const planned = planAddTiles(state, tiles);
      if (planned === null) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: [...state.input.hand, ...planned]
        },
        tenkeyBuffer: ''
      };
    }

    case 'add-hand-tiles': {
      if (action.tiles.length === 0) return state;
      const planned = planAddTiles(state, action.tiles);
      if (planned === null) return state;
      return {
        ...state,
        input: {
          ...state.input,
          hand: [...state.input.hand, ...planned]
        },
        tenkeyBuffer: ''
      };
    }
  }
};
