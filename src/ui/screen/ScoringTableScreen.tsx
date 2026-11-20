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
  type ScoringRule,
  buildFuHanTable,
  buildLimitTable
} from '../scoring-table/scoring-table';
import { STEPPER_BOUNDS, useAppDispatch, useAppState } from '../state';
import './main-screen.css';
import './scoring-table.css';

export interface ScoringTableViewProps {
  seat: Wind;
  rule: ScoringRule;
  initialDealer?: boolean;
  /** 初期の本場数(省略時 0。STEPPER_BOUNDS.continue の範囲にクランプする) */
  initialHonba?: number;
  onBack: () => void;
}

const [HONBA_MIN, HONBA_MAX] = STEPPER_BOUNDS.continue;

const clampHonba = (value: number): number => {
  if (!Number.isFinite(value)) return HONBA_MIN;
  return Math.min(HONBA_MAX, Math.max(HONBA_MIN, Math.trunc(value)));
};

/** ツモ損の方式の表示名(設定画面と同じラベル)。該当がなければ null */
export function getTsumoLossLabel(
  tsumoLoss: ScoringRule['tsumoLoss']
): string | null {
  const item = RULE_ITEMS.find(i => i.key === 'tsumoLoss');
  if (item?.kind !== 'select') return null;
  return item.options.find(o => o.value === tsumoLoss)?.label ?? null;
}

const DEALER_OPTIONS = [
  { value: 'dealer' as const, label: '親' },
  { value: 'child' as const, label: '子' }
] as const;

function renderCellLine(cell: Cell, by: 'ron' | 'tsumo'): React.JSX.Element {
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
      {cell.text}
    </span>
  );
}

/** 点数計算表の描画本体(props のみで描画し、テスト可能にする) */
export function ScoringTableView({
  seat,
  rule,
  initialDealer,
  initialHonba,
  onBack
}: ScoringTableViewProps): React.JSX.Element {
  const [dealer, setDealer] = useState<boolean>(
    () => initialDealer ?? seat === 'east'
  );
  const [honba, setHonba] = useState<number>(() =>
    clampHonba(initialHonba ?? 0)
  );

  const fuHanTable = buildFuHanTable(rule, { dealer, honba });
  const limitTable = buildLimitTable(rule, { dealer, honba });

  return (
    <div className="scoring-table-screen">
      <header className="app-header">
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
          <span className="scoring-table-screen__rule-label">
            {getTsumoLossLabel(rule.tsumoLoss)}
          </span>
        </div>
      </header>
      <main className="scoring-table-screen__content">
        <div className="scoring-table-screen__controls">
          <ConnectedButtonGroup<'dealer' | 'child'>
            label="親子"
            className="scoring-table-screen__dealer-toggle"
            options={DEALER_OPTIONS}
            value={dealer ? 'dealer' : 'child'}
            onValueChange={val => setDealer(val === 'dealer')}
          />
          <Stepper
            aria-label="積み棒"
            className="scoring-table-screen__honba-stepper"
            value={honba}
            min={HONBA_MIN}
            max={HONBA_MAX}
            onStep={delta => setHonba(prev => clampHonba(prev + delta))}
          />
        </div>

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
                            {renderCellLine(cell.ron, 'ron')}
                            {renderCellLine(cell.tsumo, 'tsumo')}
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
                  <th scope="row">{row.label}</th>
                  <td className="tabular-nums">
                    {row.ron.kind === 'value' ? row.ron.text : '-'}
                  </td>
                  <td className="tabular-nums">
                    {row.tsumo.kind === 'value' ? row.tsumo.text : '-'}
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
      onBack={() => dispatch({ type: 'navigate', screen: 'main' })}
    />
  );
}

export default ScoringTableScreen;
