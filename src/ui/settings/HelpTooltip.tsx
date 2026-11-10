import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState
} from 'react';
import type React from 'react';
import { SYMBOL_HELP, SymbolIcon } from '../icons';
import {
  INITIAL_TOOLTIP_STATE,
  type TooltipEvent,
  type TooltipState,
  reduceTooltip
} from './tooltip-logic';

interface HelpTooltipContextValue {
  state: TooltipState;
  dispatch: (event: TooltipEvent) => void;
}

const HelpTooltipContext = createContext<HelpTooltipContextValue | null>(null);

export interface HelpTooltipScopeProps {
  children: ReactNode;
  initialState?: TooltipState;
}

export function HelpTooltipScope({
  children,
  initialState = INITIAL_TOOLTIP_STATE
}: HelpTooltipScopeProps): React.JSX.Element {
  const [state, dispatch] = useReducer(reduceTooltip, initialState);

  useEffect(() => {
    if (state.openId === null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.help-tooltip')) {
        return;
      }
      dispatch({ type: 'outside-pointerdown' });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'escape' });
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.openId]);

  return (
    <HelpTooltipContext value={{ state, dispatch }}>
      {children}
    </HelpTooltipContext>
  );
}

export const useHelpTooltip = (): HelpTooltipContextValue => {
  const ctx = useContext(HelpTooltipContext);
  if (ctx === null) {
    throw new Error('HelpTooltip は HelpTooltipScope の内側で使用してください');
  }
  return ctx;
};

export interface HelpTooltipProps {
  id: string;
  label: string;
  text: string;
}

export function HelpTooltip({
  id,
  label,
  text
}: HelpTooltipProps): React.JSX.Element {
  const { state, dispatch } = useHelpTooltip();
  const isOpen = state.openId === id;
  const bubbleRef = useRef<HTMLSpanElement | null>(null);
  const [styleOffset, setStyleOffset] = useState<React.CSSProperties>({});

  // 左右の見切れ防止 (表示時に左右16px以内に収まるよう left を補正)
  useLayoutEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !bubbleRef.current) {
      return;
    }
    const rect = bubbleRef.current.getBoundingClientRect();
    const margin = 16;
    const viewportWidth = window.innerWidth;
    let shiftX = 0;

    if (rect.left < margin) {
      shiftX = margin - rect.left;
    } else if (rect.right > viewportWidth - margin) {
      shiftX = viewportWidth - margin - rect.right;
    }

    if (shiftX !== 0) {
      setStyleOffset({
        transform: `translateX(calc(-50% + ${shiftX}px))`
      });
    } else {
      setStyleOffset({});
    }
  }, [isOpen]);

  const handlePointerEnter = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(hover: hover)').matches
    ) {
      dispatch({ type: 'hover-enter', id });
    }
  };

  const handlePointerLeave = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(hover: hover)').matches
    ) {
      dispatch({ type: 'hover-leave', id });
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLButtonElement>) => {
    if (e.currentTarget.matches?.(':focus-visible')) {
      dispatch({ type: 'focus-visible', id });
    }
  };

  const handleBlur = () => {
    dispatch({ type: 'blur', id });
  };

  return (
    <span
      className="help-tooltip"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        type="button"
        className="help-tooltip__button"
        aria-label={`${label}の説明`}
        aria-expanded={isOpen}
        aria-describedby={id}
        onClick={() => dispatch({ type: 'click', id })}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <SymbolIcon d={SYMBOL_HELP} size="1.25rem" />
      </button>
      <span
        ref={bubbleRef}
        id={id}
        role="tooltip"
        className="help-tooltip__bubble"
        hidden={!isOpen}
        style={styleOffset}
      >
        {text}
      </span>
    </span>
  );
}
