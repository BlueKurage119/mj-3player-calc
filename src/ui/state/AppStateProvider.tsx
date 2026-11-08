import {
  type Dispatch,
  type ReactNode,
  createContext,
  useContext,
  useReducer
} from 'react';
import type React from 'react';
import { type RuleStorage, loadRule } from '../../core/rule-storage';
import {
  type AppAction,
  type AppState,
  appReducer,
  createInitialState
} from './app-state';

const safeLocalStorage = (): RuleStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const initAppState = (): AppState => {
  const loaded = loadRule(safeLocalStorage());
  return createInitialState(loaded.rule);
};

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);

export interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider(
  props: AppStateProviderProps
): React.JSX.Element {
  const [state, dispatch] = useReducer(appReducer, undefined, initAppState);

  return (
    <AppStateContext value={state}>
      <AppDispatchContext value={dispatch}>{props.children}</AppDispatchContext>
    </AppStateContext>
  );
}

export const useAppState = (): AppState => {
  const ctx = useContext(AppStateContext);
  if (ctx === null) {
    throw new Error('useAppState は AppStateProvider の内側で使用してください');
  }
  return ctx;
};

export const useAppDispatch = (): Dispatch<AppAction> => {
  const ctx = useContext(AppDispatchContext);
  if (ctx === null) {
    throw new Error(
      'useAppDispatch は AppStateProvider の内側で使用してください'
    );
  }
  return ctx;
};
