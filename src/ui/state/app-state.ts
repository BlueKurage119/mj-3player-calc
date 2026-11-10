import type { HandOptions, Input, Meld } from '../../core/input';
import type { Rule } from '../../core/rule';
import type { Table, Wind } from '../../core/table';
import type { Tile } from '../../core/tile';
import {
  MAX_MELDS,
  canAddHandTile,
  canAddIndicatorTile,
  canAppendTenkeyDigitFor,
  canSetMeld,
  kindOfMeld,
  maxHandLength,
  meldOfKind,
  meldTileForKey,
  planAddTiles,
  resolveTenkeyBuffer,
  sortHand
} from './hand-rules';
import {
  type SituationToggleKey,
  areHandOptionsEqual,
  isSituationKeyEnabled,
  normalizeHandOptions
} from './situation-rules';

export type Screen = 'main' | 'settings';
export type SheetMode = 'palette' | 'tenkey';
export type TenkeySuit = 'm' | 'p' | 's' | 'z';
export type MeldKind = 'pon' | 'minkan' | 'ankan';
export type IndicatorTarget = 'dora' | 'uradora';
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
  | { type: 'set-wind'; field: 'round' | 'seat'; wind: Wind }
  | { type: 'set-riichi'; riichi: HandOptions['riichi'] }
  | { type: 'set-situation'; key: SituationToggleKey; value: boolean }
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
  | { type: 'add-hand-tiles'; tiles: Tile[] }
  | { type: 'add-meld' }
  | { type: 'set-meld-kind'; i: number; kind: MeldKind }
  | { type: 'set-meld-tile'; i: number; tile: Tile }
  | { type: 'remove-meld'; i: number }
  | { type: 'add-indicator-tile'; target: IndicatorTarget; tile: Tile }
  | { type: 'remove-last-indicator-tile'; target: IndicatorTarget }
  | { type: 'clear-indicators'; target: IndicatorTarget };
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
      let currentMelds = state.input.melds;
      let target = action.target;
      const sameMeld =
        state.inputFocus?.type === 'meld' &&
        target.type === 'meld' &&
        target.i === state.inputFocus.i;
      if (
        !sameMeld &&
        state.inputFocus?.type === 'meld' &&
        currentMelds[state.inputFocus.i]?.tile === null
      ) {
        const emptyIdx = state.inputFocus.i;
        currentMelds = currentMelds.filter((_, k) => k !== emptyIdx);
        if (target.type === 'meld' && target.i > emptyIdx) {
          target = { type: 'meld', i: target.i - 1 };
        }
      }

      let currentHand = state.input.hand;
      if (state.inputFocus?.type === 'hand' && target.type !== 'hand') {
        currentHand = sortHand(currentHand, maxHandLength(currentMelds));
      }

      return {
        ...state,
        input: {
          ...state.input,
          hand: currentHand,
          melds: currentMelds
        },
        inputFocus: target,
        tenkeyBuffer: ''
      };
    }

    case 'close-sheet': {
      if (state.inputFocus === null) return state;

      let currentMelds = state.input.melds;
      if (
        state.inputFocus.type === 'meld' &&
        currentMelds[state.inputFocus.i]?.tile === null
      ) {
        const emptyIdx = state.inputFocus.i;
        currentMelds = currentMelds.filter((_, k) => k !== emptyIdx);
      }

      let currentHand = state.input.hand;
      if (state.inputFocus.type === 'hand') {
        currentHand = sortHand(currentHand, maxHandLength(currentMelds));
      }

      return {
        ...state,
        input: {
          ...state.input,
          hand: currentHand,
          melds: currentMelds
        },
        inputFocus: null,
        tenkeyBuffer: ''
      };
    }

    case 'set-wind': {
      if (state.table[action.field] === action.wind) return state;
      return {
        ...state,
        table: {
          ...state.table,
          [action.field]: action.wind
        }
      };
    }

    case 'set-riichi': {
      const nextHandOptions = normalizeHandOptions(
        { ...state.handOptions, riichi: action.riichi },
        state.rule
      );
      if (areHandOptionsEqual(state.handOptions, nextHandOptions)) {
        return state;
      }
      return {
        ...state,
        handOptions: nextHandOptions
      };
    }

    case 'set-situation': {
      if (
        action.value &&
        !isSituationKeyEnabled(action.key, state.handOptions, state.rule)
      ) {
        return state;
      }
      if (state.handOptions[action.key] === action.value) {
        return state;
      }
      const nextHandOptions = normalizeHandOptions(
        { ...state.handOptions, [action.key]: action.value },
        state.rule
      );
      if (areHandOptionsEqual(state.handOptions, nextHandOptions)) {
        return state;
      }
      return {
        ...state,
        handOptions: nextHandOptions
      };
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
      const nextHandOptions = normalizeHandOptions(state.handOptions, nextRule);
      return {
        ...state,
        rule: nextRule,
        input: nextInput,
        handOptions: nextHandOptions
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
      if (!state.inputFocus) return state;
      const focusType = state.inputFocus.type;
      if (
        focusType !== 'hand' &&
        focusType !== 'dora' &&
        focusType !== 'uradora' &&
        focusType !== 'meld'
      ) {
        return state;
      }
      if (!canAppendTenkeyDigitFor(state, action.digit)) return state;
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
      if (!state.inputFocus) return state;
      if (state.inputFocus.type === 'hand') {
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
      if (
        state.inputFocus.type === 'dora' ||
        state.inputFocus.type === 'uradora'
      ) {
        const target = state.inputFocus.type;
        if (state.input[target].length === 0) return state;
        return {
          ...state,
          input: {
            ...state.input,
            [target]: state.input[target].slice(0, -1)
          },
          tenkeyBuffer: ''
        };
      }
      if (state.inputFocus.type === 'meld') {
        return state;
      }
      return state;
    }

    case 'tenkey-commit': {
      if (!state.inputFocus) return state;
      const tiles = resolveTenkeyBuffer(state.tenkeyBuffer, action.suit);
      if (tiles === null) return state;

      if (state.inputFocus.type === 'hand') {
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

      if (
        state.inputFocus.type === 'dora' ||
        state.inputFocus.type === 'uradora'
      ) {
        const target = state.inputFocus.type;
        const currentIndicators = [...state.input[target]];
        let tempState = {
          ...state,
          input: { ...state.input, [target]: currentIndicators }
        };
        for (const tile of tiles) {
          if (!canAddIndicatorTile(tempState, target, tile)) {
            return state;
          }
          currentIndicators.push(tile);
          tempState = {
            ...tempState,
            input: { ...tempState.input, [target]: currentIndicators }
          };
        }
        return {
          ...state,
          input: {
            ...state.input,
            [target]: currentIndicators
          },
          tenkeyBuffer: ''
        };
      }

      if (state.inputFocus.type === 'meld') {
        if (tiles.length !== 1) return state;
        const meldTile = tiles[0];
        if (!meldTile) return state;
        const meldIdx = state.inputFocus.i;
        const meld = state.input.melds[meldIdx];
        if (!meld) return state;
        // '5' 由来(red:false)は赤の代替を含めて決め、'0' 由来(red:true)は従来どおり
        let placed: Tile | null = meldTile;
        if (meldTile.type !== 'z' && meldTile.n === 5 && !meldTile.red) {
          placed = meldTileForKey(state, meldIdx, kindOfMeld(meld), meldTile);
        } else if (!canSetMeld(state, meldIdx, { ...meld, tile: meldTile })) {
          placed = null;
        }
        if (placed === null) return state;
        const nextMeld: Meld = { ...meld, tile: placed };
        return {
          ...state,
          input: {
            ...state.input,
            melds: state.input.melds.map((m, idx) =>
              idx === meldIdx ? nextMeld : m
            )
          },
          tenkeyBuffer: ''
        };
      }

      return state;
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

    case 'add-meld': {
      let currentMelds = state.input.melds;
      if (
        state.inputFocus?.type === 'meld' &&
        currentMelds[state.inputFocus.i]?.tile === null
      ) {
        const emptyIdx = state.inputFocus.i;
        currentMelds = currentMelds.filter((_, k) => k !== emptyIdx);
      }
      if (currentMelds.length >= MAX_MELDS) return state;

      let currentHand = state.input.hand;
      if (state.inputFocus?.type === 'hand') {
        currentHand = sortHand(currentHand, maxHandLength(currentMelds));
      }

      const nextMeldsLength = currentMelds.length + 1;
      const nextMaxHand = 14 - 3 * nextMeldsLength;
      currentHand = currentHand.slice(0, nextMaxHand);

      const nextMelds: Meld[] = [...currentMelds, { type: 'pon', tile: null }];

      return {
        ...state,
        input: {
          ...state.input,
          hand: currentHand,
          melds: nextMelds
        },
        inputFocus: { type: 'meld', i: nextMelds.length - 1 },
        tenkeyBuffer: ''
      };
    }

    case 'set-meld-kind': {
      const meld = state.input.melds[action.i];
      if (!meld) return state;
      const nextMeld = meldOfKind(action.kind, meld.tile);
      if (!canSetMeld(state, action.i, nextMeld)) return state;
      return {
        ...state,
        input: {
          ...state.input,
          melds: state.input.melds.map((m, idx) =>
            idx === action.i ? nextMeld : m
          )
        }
      };
    }

    case 'set-meld-tile': {
      const meld = state.input.melds[action.i];
      if (!meld) return state;
      const nextMeld: Meld = { ...meld, tile: action.tile };
      if (!canSetMeld(state, action.i, nextMeld)) return state;
      return {
        ...state,
        input: {
          ...state.input,
          melds: state.input.melds.map((m, idx) =>
            idx === action.i ? nextMeld : m
          )
        },
        tenkeyBuffer: ''
      };
    }

    case 'remove-meld': {
      if (
        !Number.isInteger(action.i) ||
        action.i < 0 ||
        action.i >= state.input.melds.length
      ) {
        return state;
      }
      const nextMelds = state.input.melds.filter((_, idx) => idx !== action.i);
      let nextFocus = state.inputFocus;
      if (state.inputFocus?.type === 'meld') {
        if (state.inputFocus.i === action.i) {
          nextFocus = null;
        } else if (state.inputFocus.i > action.i) {
          nextFocus = { type: 'meld', i: state.inputFocus.i - 1 };
        }
      }
      return {
        ...state,
        input: {
          ...state.input,
          melds: nextMelds
        },
        inputFocus: nextFocus,
        tenkeyBuffer: ''
      };
    }

    case 'add-indicator-tile': {
      if (!canAddIndicatorTile(state, action.target, action.tile)) return state;
      return {
        ...state,
        input: {
          ...state.input,
          [action.target]: [...state.input[action.target], action.tile]
        },
        tenkeyBuffer: ''
      };
    }

    case 'remove-last-indicator-tile': {
      if (state.input[action.target].length === 0) return state;
      return {
        ...state,
        input: {
          ...state.input,
          [action.target]: state.input[action.target].slice(0, -1)
        },
        tenkeyBuffer: ''
      };
    }

    case 'clear-indicators':
      return {
        ...state,
        input: {
          ...state.input,
          [action.target]: []
        },
        tenkeyBuffer: ''
      };
  }
};
