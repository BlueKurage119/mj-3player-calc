import {
  type Dispatch,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState
} from 'react';
import type React from 'react';
import { type AppAction, type AppState, appReducer } from './app-state';
import {
  createInitialStateFromStorage,
  safeLocalStorage
} from './rule-persistence';

export interface RuleLoadNoticeContextValue {
  show: boolean;
  dismiss: () => void;
}

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);
const RuleLoadNoticeContext = createContext<RuleLoadNoticeContextValue | null>(
  null
);

export interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider(
  props: AppStateProviderProps
): React.JSX.Element {
  const [initialData] = useState(() =>
    createInitialStateFromStorage(safeLocalStorage())
  );
  const [state, dispatch] = useReducer(appReducer, initialData.state);
  const [showNotice, setShowNotice] = useState(initialData.loadNotice);

  const dismiss = useCallback(() => {
    setShowNotice(false);
  }, []);

  const noticeValue = useMemo(
    () => ({ show: showNotice, dismiss }),
    [showNotice, dismiss]
  );

  return (
    <AppStateContext value={state}>
      <AppDispatchContext value={dispatch}>
        <RuleLoadNoticeContext value={noticeValue}>
          {props.children}
        </RuleLoadNoticeContext>
      </AppDispatchContext>
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

export const useRuleLoadNotice = (): RuleLoadNoticeContextValue => {
  const ctx = useContext(RuleLoadNoticeContext);
  if (ctx === null) {
    throw new Error(
      'useRuleLoadNotice は AppStateProvider の内側で使用してください'
    );
  }
  return ctx;
};
