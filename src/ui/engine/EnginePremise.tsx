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
}

/**
 * 計算の前提。初期画面の要約カードと同じ部品・表記(場風・自風の文字、積み棒・供託・北のピル、ドラの牌)を使う。
 * 入力が空の項目(ドラ・抜き北)は出さない。裏ドラは牌が決まらないので出さない
 */
export function EnginePremise(props: EnginePremiseProps): React.JSX.Element {
  const { table, dora, nuki } = props;
  return (
    <section className="engine-premise" aria-label="計算の前提">
      <SummaryStatusRow table={table} nuki={nuki > 0 ? nuki : undefined} />
      {dora.length > 0 ? <SummaryDoraRowView dora={dora} /> : null}
    </section>
  );
}
