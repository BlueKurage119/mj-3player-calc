import { useState } from 'react';
import type React from 'react';
import { RULE_ITEMS } from '../../core/rule-items';
import type { Wind } from '../../core/table';
import { SYMBOL_ARROW_BACK, SymbolIcon } from '../icons';
import { Button, IconButton } from '../md';
import {
  type Cell,
  HAN_LIST,
  type ScoringRule,
  buildFuHanTable,
  buildLimitTable
} from '../scoring-table/scoring-table';
import { useAppDispatch, useAppState } from '../state';
import './main-screen.css';
import './scoring-table.css';

export interface ScoringTableViewProps {
  seat: Wind;
  rule: ScoringRule;
  initialDealer?: boolean;
  onBack: () => void;
}

/** ツモ損の方式の表示名(設定画面と同じラベル)。該当がなければ null */
export function getTsumoLossLabel(
  tsumoLoss: ScoringRule['tsumoLoss']
): string | null {
  const item = RULE_ITEMS.find(i => i.key === 'tsumoLoss');
  if (item?.kind !== 'select') return null;
  return item.options.find(o => o.value === tsumoLoss)?.label ?? null;
}

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
  onBack
}: ScoringTableViewProps): React.JSX.Element {
  const [dealer, setDealer] = useState<boolean>(
    () => initialDealer ?? seat === 'east'
  );

  const fuHanTable = buildFuHanTable(rule, { dealer });
  const limitTable = buildLimitTable(rule, { dealer });

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
        <Button
          variant="tonal"
          className="scoring-table-screen__dealer-toggle"
          aria-label={`親子の切替(現在: ${dealer ? '親' : '子'})`}
          onClick={() => setDealer(prev => !prev)}
        >
          {dealer ? '親' : '子'}
        </Button>

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
      onBack={() => dispatch({ type: 'navigate', screen: 'main' })}
    />
  );
}

export default ScoringTableScreen;
