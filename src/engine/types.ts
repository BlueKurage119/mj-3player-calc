import type { Input } from '../core/input';
import type { ScoredHora } from '../core/result';
import type { Rule } from '../core/rule';
import type { Table } from '../core/table';
import type { Tile } from '../core/tile';

export const DEFAULT_REMAINING_DRAWS = 18;

export interface EngineOptions {
  tegawari: boolean;
  backtrack: boolean;
  /** 0〜4 の整数 (既定 2) */
  backtrackDiffMargin: number;
}

export const DEFAULT_ENGINE_OPTIONS: Readonly<EngineOptions> = Object.freeze({
  tegawari: true,
  backtrack: true,
  backtrackDiffMargin: 2
});

export interface EngineRequest {
  id: number;
  table: Table;
  /** 13枚または14枚(副露分を除く) */
  input: Input;
  rule: Rule;
  /** 0〜55 の整数。既定 18 */
  remainingDraws: number;
  options: EngineOptions;
}

export interface TurnStat {
  /** 1始まり。i回目のツモまでの累積 */
  draw: number;
  tenpai: number;
  win: number;
  ev: number;
}

export interface CandidateStat {
  /** 13枚入力は null。赤と非赤の五があれば非赤を捨てる候補として表す */
  discard: Tile | null;
  /** 打牌後の13枚の向聴(0〜3) */
  shanten: number;
  tenpai: number;
  win: number;
  ev: number;
  perTurn: TurnStat[];
}

export type EngineResponse =
  | {
      id: number;
      type: 'ok';
      candidates: CandidateStat[];
      elapsedMs: number;
    }
  | { id: number; type: 'out-of-range' }
  | { id: number; type: 'not-applicable' }
  | { id: number; type: 'error'; message: string };

export interface EvaluatedWin {
  winTile: Tile;
  /** 最終形の赤の枚数 */
  red: { p: number; s: number };
  rinshan: boolean;
  /** generateResult の by === 'tsumo' の和了候補 */
  candidates: ScoredHora[];
  /** 役なしを除いた payment.total 最大。全て役なしなら null */
  best: ScoredHora | null;
}
