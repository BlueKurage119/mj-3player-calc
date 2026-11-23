import { useState } from 'react';
import type React from 'react';
import { RULE_ITEMS } from '../../core/rule-items';
import type { Wind } from '../../core/table';
import { ConnectedButtonGroup, Stepper } from '../expressive';
import { SYMBOL_ARROW_BACK, SymbolIcon } from '../icons';
import { IconButton } from '../md';
import {
  type Cell,
  HAN_LIST,
  type ScoringMode,
  type ScoringRule,
  buildFuHanTable,
  buildLimitTable
} from '../scoring-table/scoring-table';
import { STEPPER_BOUNDS, useAppDispatch, useAppState } from '../state';
import { useScrolled } from './use-scrolled';
import './main-screen.css';
import './scoring-table.css';

export interface ScoringTableViewProps {
  seat: Wind;
  rule: ScoringRule;
  initialDealer?: boolean;
  /** 初期の本場数(省略時 0。STEPPER_BOUNDS.continue の範囲にクランプする) */
  initialHonba?: number;
  /** 初期の供託本数(省略時 0。STEPPER_BOUNDS.deposit の範囲にクランプする) */
  initialDeposit?: number;
  /** 初期の表示モード(省略時 'score') */
  initialMode?: ScoringMode;
  onBack: () => void;
}

const [HONBA_MIN, HONBA_MAX] = STEPPER_BOUNDS.continue;
const [DEPOSIT_MIN, DEPOSIT_MAX] = STEPPER_BOUNDS.deposit;

const clampCount = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

/** ツモ損の方式の表示名(設定画面と同じラベル)。該当がなければ null */
export function getTsumoLossLabel(
  tsumoLoss: ScoringRule['tsumoLoss']
): string | null {
  const item = RULE_ITEMS.find(i => i.key === 'tsumoLoss');
  if (item?.kind !== 'select') return null;
  return item.options.find(o => o.value === tsumoLoss)?.label ?? null;
}

const MODE_OPTIONS = [
  { value: 'score' as const, label: '得点' },
  { value: 'diff' as const, label: '点差' }
] as const;

const DEALER_OPTIONS = [
  { value: 'dealer' as const, label: '親' },
  { value: 'child' as const, label: '子' }
] as const;

function renderCellLine(
  cell: Cell,
  by: 'ron' | 'tsumo',
  mode: ScoringMode
): React.JSX.Element {
  if (cell.kind === 'absent') {
    return (
      <span
        className={`scoring-table__value scoring-table__value--${by} scoring-table__value--absent`}
        aria-hidden="true"
      />
    );
  }
  if (cell.kind === 'na') {
    return (
      <span
        className={`scoring-table__value scoring-table__value--${by} scoring-table__na`}
        data-cell-kind="na"
      >
        -
      </span>
    );
  }
  return (
    <span
      className={`scoring-table__value scoring-table__value--${by} tabular-nums`}
    >
      {mode === 'diff' ? cell.diffText : cell.text}
    </span>
  );
}

/** 点数計算表の描画本体(props のみで描画し、テスト可能にする) */
export function ScoringTableView({
  seat,
  rule,
  initialDealer,
  initialHonba,
  initialDeposit,
  initialMode,
  onBack
}: ScoringTableViewProps): React.JSX.Element {
  const [mode, setMode] = useState<ScoringMode>(() => initialMode ?? 'score');
  const [dealer, setDealer] = useState<boolean>(
    () => initialDealer ?? seat === 'east'
  );
  const [honba, setHonba] = useState<number>(() =>
    clampCount(initialHonba ?? 0, HONBA_MIN, HONBA_MAX)
  );
  const [deposit, setDeposit] = useState<number>(() =>
    clampCount(initialDeposit ?? 0, DEPOSIT_MIN, DEPOSIT_MAX)
  );

  const fuHanTable = buildFuHanTable(rule, { dealer, honba, deposit });
  const limitTable = buildLimitTable(rule, { dealer, honba, deposit });
  const scrolled = useScrolled();

  return (
    <div className="scoring-table-screen">
      <header
        className="app-header"
        data-scrolled={scrolled ? 'true' : 'false'}
      >
        <div className="app-header__inner app-header__inner--start">
          <IconButton
            variant="standard"
            label="戻る"
            className="scoring-table-screen__back-button"
            onClick={onBack}
          >
            <SymbolIcon d={SYMBOL_ARROW_BACK} />
          </IconButton>
          <h1 className="app-header__title">点数計算表</h1>
          <span
            className="scoring-table-screen__rule-label"
            data-tsumo-loss={rule.tsumoLoss}
          >
            {getTsumoLossLabel(rule.tsumoLoss)}
          </span>
          <ConnectedButtonGroup<ScoringMode>
            label="表示切替"
            className="scoring-table-screen__mode-toggle"
            options={MODE_OPTIONS}
            value={mode}
            onValueChange={setMode}
          />
        </div>
        <div className="scoring-table-screen__controls">
          <ConnectedButtonGroup<'dealer' | 'child'>
            label="親子"
            className="scoring-table-screen__dealer-toggle"
            options={DEALER_OPTIONS}
            value={dealer ? 'dealer' : 'child'}
            onValueChange={val => setDealer(val === 'dealer')}
          />
          <div className="scoring-table-screen__steppers">
            <Stepper
              aria-label="積み棒"
              className="scoring-table-screen__honba-stepper"
              value={honba}
              min={HONBA_MIN}
              max={HONBA_MAX}
              onStep={delta =>
                setHonba(prev => clampCount(prev + delta, HONBA_MIN, HONBA_MAX))
              }
            />
            {mode === 'diff' && (
              <Stepper
                aria-label="供託"
                className="scoring-table-screen__deposit-stepper"
                value={deposit}
                min={DEPOSIT_MIN}
                max={DEPOSIT_MAX}
                onStep={delta =>
                  setDeposit(prev =>
                    clampCount(prev + delta, DEPOSIT_MIN, DEPOSIT_MAX)
                  )
                }
              />
            )}
          </div>
        </div>
      </header>
      <main className="scoring-table-screen__content">
        <div className="scoring-table__scroll">
          <table className="scoring-table scoring-table--fu-han">
            <thead>
              <tr>
                <th scope="col" className="scoring-table__corner">
                  符
                </th>
                {HAN_LIST.map(han => (
                  <th key={han} scope="col">
                    {han}飜
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fuHanTable.map(row => {
                const fu = row[0]?.fu ?? 0;
                return (
                  <tr key={fu}>
                    <th scope="row" className="tabular-nums">
                      {fu}符
                    </th>
                    {row.map(cell => (
                      <td
                        key={`${cell.fu}-${cell.han}`}
                        data-limit={cell.limit ?? undefined}
                      >
                        {cell.ron.kind === 'absent' &&
                        cell.tsumo.kind === 'absent' ? null : (
                          <div className="scoring-table__cell-values">
                            {renderCellLine(cell.ron, 'ron', mode)}
                            {renderCellLine(cell.tsumo, 'tsumo', mode)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="scoring-table__scroll">
          <table className="scoring-table scoring-table--limit">
            <thead>
              <tr>
                <th scope="col" className="scoring-table__corner">
                  飜
                </th>
                <th scope="col">ロン</th>
                <th scope="col">ツモ</th>
              </tr>
            </thead>
            <tbody>
              {limitTable.map(row => (
                <tr
                  key={row.label}
                  className="scoring-table__limit-row"
                  data-limit={row.kind}
                >
                  <th scope="row">
                    <div className="scoring-table__limit-heading">
                      <span className="scoring-table__limit-name">
                        {row.name}
                      </span>
                      <span className="scoring-table__limit-han">
                        {row.label}
                      </span>
                    </div>
                  </th>
                  <td className="tabular-nums">
                    {row.ron.kind === 'value'
                      ? mode === 'diff'
                        ? row.ron.diffText
                        : row.ron.text
                      : '-'}
                  </td>
                  <td className="tabular-nums">
                    {row.tsumo.kind === 'value'
                      ? mode === 'diff'
                        ? row.tsumo.diffText
                        : row.tsumo.text
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

/** 点数計算表画面 */
export function ScoringTableScreen(): React.JSX.Element {
  const { table, rule } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <ScoringTableView
      seat={table.seat}
      rule={rule}
      initialHonba={table.continue}
      initialDeposit={table.deposit}
      onBack={() => dispatch({ type: 'navigate', screen: 'main' })}
    />
  );
}

export default ScoringTableScreen;
