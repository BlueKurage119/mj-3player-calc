import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import { ConnectedButtonGroup } from '../expressive';
import { SYMBOL_ARROW_BACK, SYMBOL_HELP, SymbolIcon } from '../icons';
import { Button, IconButton } from '../md';
import { GlanceTiles } from '../result/slots';
import { EnginePremise, type EnginePremiseProps } from './EnginePremise';
import { EngineResult, type EngineResultProps } from './EngineResult';
import type { EngineFailReason, EngineRunState } from './engine-run';
import { formatElapsed } from './chart-series';
import './engine.css';

export const FAIL_MESSAGES: Record<EngineFailReason, string> = {
  'out-of-range': '4向聴以上は計算できません',
  'not-applicable': 'この手牌は計算できません',
  error: '計算できませんでした'
};

export type EngineMethod = 'rough' | 'detailed';

export interface EngineViewProps {
  onBack: () => void;
  onOpenHelp: () => void;
  /** 対象の手牌(副露を含む縮小表示用) */
  tiles: CoreTile[];
  /** 計算の前提(ドラ表示牌・抜き北・場風・自風) */
  premise: EnginePremiseProps;
  /** 計算できる入力か。false のときは実行ボタンを出さない */
  available: boolean;
  /** 計算方法の2択を出すか(13枚の聴牌・1向聴では出さない) */
  methodChoice: boolean;
  detailed: boolean;
  onDetailedChange: (detailed: boolean) => void;
  /** 「時間がかかります」を出すか(t3-静的) */
  slow: boolean;
  /** 現在の入力・条件に対する状態(古い結果は呼び出し側で捨てる) */
  run: EngineRunState;
  onRun: () => void;
  onCancel: () => void;
  result: Pick<
    EngineResultProps,
    | 'displayTurn'
    | 'onTurnChange'
    | 'selectedIndex'
    | 'onSelect'
    | 'rankMetric'
    | 'onRankMetricChange'
  >;
}

const METHOD_OPTIONS = [
  { value: 'rough', label: '概算' },
  { value: 'detailed', label: '手替わりを詳しく' }
] as const;

/** 計算画面の描画本体(props のみで描画し、テスト可能にする) */
export function EngineView(props: EngineViewProps): React.JSX.Element {
  const { run } = props;
  const running = run.status === 'running';
  return (
    <div className="engine-screen">
      <header className="app-header">
        <div className="app-header__inner app-header__inner--start">
          <IconButton
            variant="standard"
            label="戻る"
            className="engine-screen__back-button"
            onClick={props.onBack}
          >
            <SymbolIcon d={SYMBOL_ARROW_BACK} />
          </IconButton>
          <h1 className="app-header__title">確率・期待値</h1>
          <IconButton
            variant="standard"
            label="ヘルプ"
            className="engine-screen__help-button"
            onClick={props.onOpenHelp}
          >
            <SymbolIcon d={SYMBOL_HELP} />
          </IconButton>
        </div>
      </header>
      <main className="engine-screen__content">
        <section className="engine-screen__hand" aria-label="対象の手牌">
          <GlanceTiles tiles={props.tiles} />
          <EnginePremise {...props.premise} />
        </section>
        {props.available ? (
          <section className="engine-screen__controls">
            <div className="engine-screen__actions">
              {props.methodChoice ? (
                <ConnectedButtonGroup
                  className="engine-screen__method"
                  label="計算方法"
                  options={METHOD_OPTIONS.map(o => ({
                    ...o,
                    disabled: running
                  }))}
                  value={props.detailed ? 'detailed' : 'rough'}
                  onValueChange={v => props.onDetailedChange(v === 'detailed')}
                />
              ) : null}
              {running ? (
                <Button
                  variant="outlined"
                  className="engine-screen__run"
                  onClick={props.onCancel}
                >
                  中止
                </Button>
              ) : (
                <Button
                  variant="filled"
                  className="engine-screen__run"
                  onClick={props.onRun}
                >
                  計算する
                </Button>
              )}
            </div>
            {props.slow ? (
              <p className="engine-screen__note">時間がかかります</p>
            ) : null}
            {running ? (
              <div className="engine-screen__running">
                <output className="engine-spinner" aria-label="計算中" />
                <span className="engine-screen__elapsed tabular-nums">
                  {formatElapsed(run.elapsedMs)}
                </span>
              </div>
            ) : null}
          </section>
        ) : (
          <p className="engine-screen__error">計算できません</p>
        )}
        {run.status === 'failed' ? (
          <p className="engine-screen__error">{FAIL_MESSAGES[run.reason]}</p>
        ) : null}
        {run.status === 'done' ? (
          <EngineResult candidates={run.candidates} {...props.result} />
        ) : null}
      </main>
    </div>
  );
}
