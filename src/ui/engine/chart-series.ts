// 結果から系列・表示用の値を組む純関数(グラフの種類に依存しない形。b案へ移るときはここに足す)
import type { CandidateStat, TurnStat } from '../../engine/types';

/** 計算する巡目数(perTurn の長さ) */
export const CHART_TURNS = 18;

export interface ChartSeries {
  /** 'win' | 'tenpai' | 候補の牌キーなど */
  id: string;
  /** 凡例 */
  label: string;
  /** 例 '--md-sys-color-primary' */
  colorToken: string;
  /** 長さ18。0〜1 */
  values: number[];
}

/** i 巡目(1始まり)の累積値。範囲外は端に丸める。perTurn が空なら 0 */
export const statAt = (c: CandidateStat, turn: number): TurnStat => {
  const i = Math.min(Math.max(turn, 1), c.perTurn.length) - 1;
  return c.perTurn[i] ?? { draw: turn, tenpai: c.tenpai, win: c.win, ev: c.ev };
};

/** a案: 1候補の和了率・聴牌率の2系列 */
export const toRateSeries = (c: CandidateStat): ChartSeries[] => [
  {
    id: 'win',
    label: '和了率',
    colorToken: '--md-sys-color-primary',
    values: c.perTurn.map(t => t.win)
  },
  {
    id: 'tenpai',
    label: '聴牌率',
    colorToken: '--md-sys-color-tertiary',
    values: c.perTurn.map(t => t.tenpai)
  }
];

export interface RankedCandidate {
  /** candidates 内の元の位置(F1の並び。選択の識別に使う) */
  index: number;
  candidate: CandidateStat;
}

/** 候補を、表示巡目の期待値の降順に並べる。同値は和了率の降順、さらに同値は元の並び */
export const rankCandidates = (
  candidates: readonly CandidateStat[],
  turn: number
): RankedCandidate[] =>
  candidates
    .map((candidate, index) => ({ index, candidate }))
    .sort((a, b) => {
      const sa = statAt(a.candidate, turn);
      const sb = statAt(b.candidate, turn);
      return sb.ev - sa.ev || sb.win - sa.win || a.index - b.index;
    });

/** 表示用の書式 */
export const formatPercent = (rate: number): string =>
  `${(rate * 100).toFixed(1)}%`;

export const formatEv = (ev: number): string =>
  String(Math.round(ev)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** 経過時間の書式。1分未満は「N秒」、以上は「m分s秒」 */
export const formatElapsed = (ms: number): string => {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
};
