import type { Input } from '../core/input';
import type { ScoredHora } from '../core/result';
import type { Rule } from '../core/rule';
import type { Table } from '../core/table';
import type { Tile } from '../core/tile';

export const DEFAULT_REMAINING_DRAWS = 18;

export interface EngineOptions {
  tegawari: boolean;
  backtrack: boolean;
  /**
   * 維持・戻しの打牌に課す開始手からの差の余裕 M(§3.6a)。0〜2 の整数。
   * 既定は D-1a の実測後にオーナーが決める(決まるまでの仮の既定は 0)
   */
  diffSlack: number;
  /**
   * true のとき s_ref = 1 の計算だけ、実効の M を max(diffSlack, 1) とする(第14版)。
   * s_ref ≥ 2 では diffSlack のまま。既定 false
   */
  oneShantenSlack: boolean;
}

export const DEFAULT_ENGINE_OPTIONS: Readonly<EngineOptions> = Object.freeze({
  tegawari: true,
  backtrack: true,
  diffSlack: 0,
  oneShantenSlack: false
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
  /**
   * 測定用の内部フラグ(確定 Q18 の対案S。製品の既定には入れない)。
   * 差の上限の基準を、候補ごとにその候補自身の13枚の向聴にする
   */
  __experimentalPerCandidateRef?: boolean;
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
