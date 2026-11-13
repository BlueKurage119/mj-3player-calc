import { useEffect, useRef, useState } from 'react';
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
import { ResultBanner } from './ResultBanner';
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

/** 要約カードを出す判定の上端に足す高さ(カードの最小の高さの約半分。先頭で出ないよう半分にとどめる) */
const SUMMARY_SHOW_EXTRA_PX = 20;
/** 要約カードが覆う高さの初期値(表示中の実測で更新する)。状況の行だけ / 状況+ドラ */
const SUMMARY_COVER_STATUS_PX = 36;
const SUMMARY_COVER_DORA_PX = 68;

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

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const update = () => setHeaderHeight(el.offsetHeight);
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const statusRef = useRef<HTMLDivElement | null>(null);
  const doraRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const resultPanelRef = useRef<HTMLElement | null>(null);
  // 要約カードを出すときだけ、判定の上端をヘッダーの下に SUMMARY_SHOW_EXTRA_PX 足す
  // (カードが覆う位置に入った時点で出す)。出ている間は足さず、しきい値の差でちらつきを抑える
  const [summaryShown, setSummaryShown] = useState(false);
  // ドラ・手牌の行は、要約カードの上の行が覆う高さ分も「隠れた」とみなす
  // (状況の行だけのカード、状況+ドラのカードの高さ。表示中に実測して更新する)
  const summaryInnerRef = useRef<HTMLDivElement | null>(null);
  const [cover, setCover] = useState({
    status: SUMMARY_COVER_STATUS_PX,
    dora: SUMMARY_COVER_DORA_PX
  });
  const margin = (px: number) => ({
    rootMargin: `-${headerHeight + px}px 0px 0px 0px`,
    minRatio: 0.5
  });
  const statusInView = useInView(
    statusRef,
    margin(summaryShown ? 0 : SUMMARY_SHOW_EXTRA_PX),
    true
  );
  const doraInView = useInView(doraRef, margin(cover.status), true);
  const handDoraShown = !statusInView && !doraInView;
  const handInView = useInView(
    handRef,
    margin(handDoraShown ? cover.dora : cover.status),
    true
  );
  const summaryRows = {
    status: !statusInView,
    dora: !statusInView && !doraInView,
    hand: !statusInView && !handInView
  };
  const summaryVisible =
    summaryRows.status || summaryRows.dora || summaryRows.hand;
  useEffect(() => {
    setSummaryShown(summaryVisible);
  }, [summaryVisible]);
  const { status: rowStatus, dora: rowDora, hand: rowHand } = summaryRows;
  useEffect(() => {
    const h = summaryInnerRef.current?.offsetHeight ?? 0;
    if (h === 0) return;
    if (rowStatus && !rowDora && !rowHand) {
      setCover(c => (c.status === h ? c : { ...c, status: h }));
    } else if (rowStatus && rowDora && !rowHand) {
      setCover(c => (c.dora === h ? c : { ...c, dora: h }));
    }
  }, [rowStatus, rowDora, rowHand]);
  const sheetOpen = inputFocus !== null;

  return (
    <div
      className="app-shell"
      style={
        { '--app-header-height': `${headerHeight}px` } as React.CSSProperties
      }
    >
      <AppHeader headerRef={headerRef} />
      <main className="main-screen">
        <SummaryCard rows={summaryRows} innerRef={summaryInnerRef} />
        <section className="input-section" aria-label="入力">
          <div className="input-group">
            <div
              ref={statusRef}
              className="input-slot"
              data-slot="wind-segment"
            >
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
          </div>
          <div
            ref={doraRef}
            className="input-slot indicator-row"
            data-slot="dora-uradora"
          >
            <IndicatorCard target="dora" />
            <IndicatorCard target="uradora" />
          </div>
          <div className="input-group">
            <div ref={handRef}>
              <HandCard />
            </div>
            <div className="input-slot" data-slot="melds">
              <MeldArea />
            </div>
          </div>
          <div className="input-slot" data-slot="situation">
            <SituationCard />
          </div>
        </section>
        <ResultPanel
          ref={resultPanelRef}
          resultState={resultState}
          dispatchTimestampRef={dispatchTimestampRef}
          context={{ table, rule }}
        />
        <div className="main-screen__bottom-spacer" aria-hidden="true" />
      </main>
      <ResultBanner
        resultState={resultState}
        panelRef={resultPanelRef}
        headerHeight={headerHeight}
        waitInput={input.hand.length % 3 === 1}
      />
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
