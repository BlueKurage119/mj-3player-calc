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
import {
  type AppAction,
  type AppState,
  appReducer,
  isSilentReject
} from './app-state';
import {
  createInitialStateFromStorage,
  safeLocalStorage
} from './rule-persistence';

export interface RuleLoadNoticeContextValue {
  show: boolean;
  dismiss: () => void;
}

interface WrappedAppState {
  app: AppState;
  rejectSeq: number;
}

const wrappedAppReducer = (
  prev: WrappedAppState,
  action: AppAction
): WrappedAppState => {
  const nextApp = appReducer(prev.app, action);
  const reject = isSilentReject(prev.app, action, nextApp);
  return {
    app: nextApp,
    rejectSeq: reject ? prev.rejectSeq + 1 : prev.rejectSeq
  };
};

const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<Dispatch<AppAction> | null>(null);
const AppRejectSeqContext = createContext<number>(0);
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
  const [wrapped, dispatch] = useReducer(
    wrappedAppReducer,
    initialData.state,
    app => ({ app, rejectSeq: 0 })
  );
  const [showNotice, setShowNotice] = useState(initialData.loadNotice);

  const dismiss = useCallback(() => {
    setShowNotice(false);
  }, []);

  const noticeValue = useMemo(
    () => ({ show: showNotice, dismiss }),
    [showNotice, dismiss]
  );

  return (
    <AppStateContext value={wrapped.app}>
      <AppDispatchContext value={dispatch}>
        <AppRejectSeqContext value={wrapped.rejectSeq}>
          <RuleLoadNoticeContext value={noticeValue}>
            {props.children}
          </RuleLoadNoticeContext>
        </AppRejectSeqContext>
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

export const useRejectSeq = (): number => {
  return useContext(AppRejectSeqContext);
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
