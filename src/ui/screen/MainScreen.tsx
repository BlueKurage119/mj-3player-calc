import { useRef } from 'react';
import type React from 'react';
import { useResult } from '../calc/use-result';
import { BottomSheet, Stepper } from '../expressive';
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
import { ResultPanel } from './ResultPanel';
import { SummaryCard } from './SummaryCard';
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

export function MainScreen(): React.JSX.Element {
  const { rule, table, input, inputFocus } = useAppState();
  const dispatch = useAppDispatch();
  const resultState = useResult();
  const dispatchTimestampRef = useRef<number | null>(null);

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
          <div className="input-slot" data-slot="wind-segment" />
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
          <div className="input-slot" data-slot="dora-uradora" />
          <HandCard />
          <div className="input-slot" data-slot="melds" />
          <div className="input-slot" data-slot="situation" />
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
      >
        <div className="sheet-slot" data-slot={getSheetSlotName(inputFocus)} />
      </BottomSheet>
    </div>
  );
}
