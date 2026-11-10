import { useRef } from 'react';
import type React from 'react';
import { useResult } from '../calc/use-result';
import { BottomSheet, ConnectedButtonGroup, Stepper } from '../expressive';
import { SYMBOL_DIALPAD, SYMBOL_KEYBOARD_KEYS, SymbolIcon } from '../icons';
import {
  MeldKindBar,
  SituationSheet,
  Tenkey,
  TilePalette,
  isSheetKeyboardTarget,
  useTenkeyKeyboard
} from '../input';
import {
  type AppAction,
  STEPPER_BOUNDS,
  type SheetTarget,
  isNukiEnabled,
  useAppDispatch,
  useAppState
} from '../state';
import { AppHeader } from './AppHeader';
import { HandCard } from './HandCard';
import { IndicatorCard } from './IndicatorCard';
import { MeldArea } from './MeldArea';
import { ResultPanel } from './ResultPanel';
import { SituationCard } from './SituationCard';
import { SummaryCard } from './SummaryCard';
import { WindSegment } from './WindSegment';
import { useInView } from './use-in-view';
import './main-screen.css';

const getSheetSlotName = (target: SheetTarget | null): string => {
  if (!target) return 'sheet-empty';
  switch (target.type) {
    case 'hand':
      return 'sheet-hand';
    case 'dora':
      return 'sheet-dora';
    case 'uradora':
      return 'sheet-uradora';
    case 'meld':
      return `sheet-meld-${target.i}`;
    case 'situation':
      return 'sheet-situation';
  }
};

function SheetModeToggle(): React.JSX.Element {
  const { sheetMode } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <ConnectedButtonGroup
      label="入力方式"
      className="sheet-mode-toggle"
      value={sheetMode}
      options={[
        {
          value: 'palette',
          label: 'パレット',
          icon: <SymbolIcon d={SYMBOL_KEYBOARD_KEYS} />
        },
        {
          value: 'tenkey',
          label: 'テンキー',
          icon: <SymbolIcon d={SYMBOL_DIALPAD} size="1.25rem" />
        }
      ]}
      onValueChange={mode => dispatch({ type: 'set-sheet-mode', mode })}
    />
  );
}

export function MainScreen(): React.JSX.Element {
  const { rule, table, input, inputFocus, sheetMode } = useAppState();
  const dispatch = useAppDispatch();
  const resultState = useResult();
  const dispatchTimestampRef = useRef<number | null>(null);

  useTenkeyKeyboard();

  const trackedDispatch = (action: AppAction) => {
    if (import.meta.env.DEV) {
      dispatchTimestampRef.current = performance.now();
    }
    dispatch(action);
  };

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const isTopInView = useInView(topSentinelRef, undefined, true);
  const summaryVisible = !isTopInView;
  const sheetOpen = inputFocus !== null;

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="main-screen">
        <section className="input-section" aria-label="入力">
          <div
            ref={topSentinelRef}
            className="input-section__sentinel"
            aria-hidden="true"
          />
          <div className="input-slot" data-slot="wind-segment">
            <WindSegment />
          </div>
          <div className="stepper-group">
            <Stepper
              aria-label="積み棒"
              value={table.continue}
              min={STEPPER_BOUNDS.continue[0]}
              max={STEPPER_BOUNDS.continue[1]}
              onStep={delta =>
                trackedDispatch({ type: 'step', field: 'continue', delta })
              }
            />
            <Stepper
              aria-label="供託"
              value={table.deposit}
              min={STEPPER_BOUNDS.deposit[0]}
              max={STEPPER_BOUNDS.deposit[1]}
              onStep={delta =>
                trackedDispatch({ type: 'step', field: 'deposit', delta })
              }
            />
            <Stepper
              aria-label="抜き北"
              value={input.nuki}
              min={STEPPER_BOUNDS.nuki[0]}
              max={STEPPER_BOUNDS.nuki[1]}
              disabled={!isNukiEnabled(rule)}
              onStep={delta =>
                trackedDispatch({ type: 'step', field: 'nuki', delta })
              }
            />
          </div>
          <div className="input-slot indicator-row" data-slot="dora-uradora">
            <IndicatorCard target="dora" />
            <IndicatorCard target="uradora" />
          </div>
          <HandCard />
          <div className="input-slot" data-slot="melds">
            <MeldArea />
          </div>
          <div className="input-slot" data-slot="situation">
            <SituationCard />
          </div>
        </section>
        <SummaryCard visible={summaryVisible} sheetOpen={sheetOpen} />
        <ResultPanel
          resultState={resultState}
          dispatchTimestampRef={dispatchTimestampRef}
        />
        <div className="main-screen__bottom-spacer" aria-hidden="true" />
      </main>
      <BottomSheet
        open={sheetOpen}
        onClose={() => dispatch({ type: 'close-sheet' })}
        aria-label="入力パネル"
        header={
          inputFocus && isSheetKeyboardTarget(inputFocus) ? (
            <SheetModeToggle />
          ) : undefined
        }
      >
        <div className="sheet-slot" data-slot={getSheetSlotName(inputFocus)}>
          {inputFocus?.type === 'hand' ||
          inputFocus?.type === 'dora' ||
          inputFocus?.type === 'uradora' ? (
            sheetMode === 'tenkey' ? (
              <Tenkey />
            ) : (
              <TilePalette />
            )
          ) : inputFocus?.type === 'meld' ? (
            <div className="sheet-meld-content">
              <MeldKindBar i={inputFocus.i} />
              {sheetMode === 'tenkey' ? <Tenkey /> : <TilePalette />}
            </div>
          ) : inputFocus?.type === 'situation' ? (
            <SituationSheet />
          ) : null}
        </div>
      </BottomSheet>
    </div>
  );
}
