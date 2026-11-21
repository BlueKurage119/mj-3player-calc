import type React from 'react';
import type { Table } from '../../core/table';
import type { Tile as CoreTile } from '../../core/tile';
import { SummaryDoraRowView, SummaryStatusRow } from '../screen/SummaryCard';
import './engine.css';

export interface EnginePremiseProps {
  table: Table;
  /** ドラ表示牌 */
  dora: CoreTile[];
  /** 抜き北の枚数 */
  nuki: number;
  /** 抜き北のあるルールか(共通役牌モードでは false。北の表示自体を出さない) */
  nukiEnabled: boolean;
}

/**
 * 計算の前提。初期画面の要約カードと同じ部品・表記(場風・自風の文字、積み棒・供託・北のピル、ドラの牌)を使う。
 * 積み棒・供託は計算に使わない値なので出さない。抜き北は、共通役牌モードでなければ 0 枚でも出す(共通役牌モードでは北の表示なし)。ドラは入力があるときだけ。裏ドラは牌が決まらないので出さない
 */
export function EnginePremise(props: EnginePremiseProps): React.JSX.Element {
  const { table, dora, nuki, nukiEnabled } = props;
  return (
    <section className="engine-premise" aria-label="計算の前提">
      <SummaryStatusRow
        table={table}
        nuki={nukiEnabled ? nuki : undefined}
        showCounters={false}
      />
      {dora.length > 0 ? <SummaryDoraRowView dora={dora} /> : null}
    </section>
  );
}
