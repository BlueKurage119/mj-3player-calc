// 結果から系列・表示用の値を組む純関数(グラフの種類に依存しない形。b案へ移るときはここに足す)
import type { CandidateStat } from '../../engine/types';
import type { Tile as CoreTile } from '../../core/tile';

/** 計算する巡目数(perTurn の長さ) */
export const CHART_TURNS = 18;

export interface ChartSeries {
  /** 'win' | 'tenpai' | 候補の牌キーなど */
  id: string;
  /** 凡例 */
  label: string;
  /** 例 '--md-sys-color-primary' */
  colorToken: string;
  /** 長さ18。a案(和了率・聴牌率)は 0〜1、b案の期待値は点 */
  values: number[];
  /** 線の破線パターン(SVG の stroke-dasharray。省略は実線) */
  dash?: string | undefined;
  /** b案: 凡例に出す候補の打牌(牌画像) */
  tile?: CoreTile | undefined;
}

/** 順位づけに使える指標(列ヘッダーで選ぶ) */
export type RankMetric = 'win' | 'tenpai' | 'ev';

export const RANK_METRICS: readonly { value: RankMetric; label: string }[] = [
  { value: 'win', label: '和了率' },
  { value: 'tenpai', label: '聴牌率' },
  { value: 'ev', label: '期待値' }
];

export const DEFAULT_RANK_METRIC: RankMetric = 'ev';

/** 巡目 i の値(累積) */
export interface TurnValue {
  /** 1〜18 */
  turn: number;
  /** 巡目 i のとき、いまの手牌から残りのツモ回数(18 − i) */
  remaining: number;
  tenpai: number;
  win: number;
  ev: number;
}

/**
 * 巡目 i(1〜18)の値。巡目 i は「いまの手牌から残りツモ 18−i 回」の累積値(1巡目が最大、18巡目は残り0回)。
 * エンジンの perTurn[k] は draw=k+1 回までの累積なので、巡目 i は draw=18−i、つまり perTurn[17−i]
 * (i=1 → perTurn[16]、i=17 → perTurn[0])。
 * 残り0回(i=18)はエンジンが返さないので画面側で補う: 和了率 0・期待値 0、
 * 聴牌率はその候補の打牌後の13枚が聴牌(向聴0)なら 1、そうでなければ 0。範囲外の i は端に丸める
 */
export const statAt = (c: CandidateStat, turn: number): TurnValue => {
  const t = Math.min(Math.max(Math.round(turn), 1), CHART_TURNS);
  const remaining = CHART_TURNS - t;
  if (remaining === 0) {
    return {
      turn: t,
      remaining,
      tenpai: c.shanten === 0 ? 1 : 0,
      win: 0,
      ev: 0
    };
  }
  const s = c.perTurn[remaining - 1];
  return {
    turn: t,
    remaining,
    tenpai: s?.tenpai ?? 0,
    win: s?.win ?? 0,
    ev: s?.ev ?? 0
  };
};

/** 巡目 1〜18 の値(グラフ・表の元) */
export const turnValues = (c: CandidateStat): TurnValue[] =>
  Array.from({ length: CHART_TURNS }, (_, i) => statAt(c, i + 1));

/** a案: 1候補の和了率・聴牌率の2系列(横軸は巡目 1〜18) */
export const toRateSeries = (c: CandidateStat): ChartSeries[] => {
  const vs = turnValues(c);
  return [
    {
      id: 'win',
      label: '和了率',
      colorToken: '--md-sys-color-primary',
      values: vs.map(v => v.win)
    },
    {
      id: 'tenpai',
      label: '聴牌率',
      colorToken: '--md-sys-color-tertiary',
      dash: '5 3',
      values: vs.map(v => v.tenpai)
    }
  ];
};

/** b案の縦軸 */
export interface ChartAxis {
  kind: 'percent' | 'point';
  /** 縦軸の上端の値(percent は 1、point は期待値の最大を切り上げたきりのよい値) */
  max: number;
}

export const PERCENT_AXIS: ChartAxis = { kind: 'percent', max: 1 };

/** 折れ線5本に割り当てる色トークン(色相順: 緑・青緑・紫・赤褐・黄褐。セカンダリー系を除く5色。quinary・senary は 別PRで main に追加済みで、develop/v2.0 への同期後に有効になる)と、色に頼らない識別用の破線 */
export const CANDIDATE_LINE_STYLES: readonly {
  colorToken: string;
  dash: string | undefined;
}[] = [
  { colorToken: '--md-sys-color-primary', dash: undefined },
  { colorToken: '--md-sys-color-tertiary', dash: '6 3' },
  { colorToken: '--md-sys-color-senary', dash: '2 2' },
  { colorToken: '--md-sys-color-quinary', dash: '6 3 2 3' },
  { colorToken: '--md-sys-color-quaternary', dash: '1 3' }
];

/** b案で描く候補の数 */
export const CANDIDATE_LINE_LIMIT = CANDIDATE_LINE_STYLES.length;

/** v 以上の、1・2・5 × 10^k のうち最小の値(縦軸の上端) */
export const niceMax = (v: number): number => {
  if (!(v > 1)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) {
    if (m * p >= v) return m * p;
  }
  return 10 * p;
};

export interface CandidateSeriesResult {
  series: ChartSeries[];
  axis: ChartAxis;
}

/**
 * b案: 14枚入力の上位候補(表示巡目での指標の値の降順。候補行の並びの先頭 limit 件)ごとの折れ線。
 * 系列の順・色は行の順位に対応する。期待値のときは縦軸を点にして上端を最大値から決める
 */
export const toCandidateSeries = (
  candidates: readonly CandidateStat[],
  turn: number,
  metric: RankMetric,
  limit: number = CANDIDATE_LINE_LIMIT
): CandidateSeriesResult => {
  const top = rankCandidates(candidates, turn, metric).slice(0, limit);
  const series = top.map(({ index, candidate }, i): ChartSeries => {
    const style = CANDIDATE_LINE_STYLES[i % CANDIDATE_LINE_STYLES.length] ?? {
      colorToken: '--md-sys-color-primary',
      dash: undefined
    };
    return {
      id: `cand-${index}`,
      label: RANK_METRICS.find(m => m.value === metric)?.label ?? '',
      colorToken: style.colorToken,
      dash: style.dash,
      tile: candidate.discard ?? undefined,
      values: turnValues(candidate).map(v => v[metric])
    };
  });
  if (metric !== 'ev') return { series, axis: PERCENT_AXIS };
  const max = Math.max(0, ...series.flatMap(s => s.values));
  return { series, axis: { kind: 'point', max: niceMax(max) } };
};

export interface RankedCandidate {
  /** candidates 内の元の位置(F1の並び。選択の識別に使う) */
  index: number;
  candidate: CandidateStat;
}

/**
 * 候補を、表示巡目の指標(既定は期待値)の降順に並べる。
 * 同値は 期待値 → 和了率 の降順、さらに同値は元の並び
 */
export const rankCandidates = (
  candidates: readonly CandidateStat[],
  turn: number,
  metric: RankMetric = DEFAULT_RANK_METRIC
): RankedCandidate[] =>
  candidates
    .map((candidate, index) => ({ index, candidate }))
    .sort((a, b) => {
      const sa = statAt(a.candidate, turn);
      const sb = statAt(b.candidate, turn);
      return (
        sb[metric] - sa[metric] ||
        sb.ev - sa.ev ||
        sb.win - sa.win ||
        a.index - b.index
      );
    });

/** 向聴戻しの候補か(打牌後の向聴が、候補の中の最小より大きい)。13枚入力は常に false */
export const isShantenBack = (
  c: CandidateStat,
  candidates: readonly CandidateStat[]
): boolean =>
  c.discard !== null && c.shanten > Math.min(...candidates.map(x => x.shanten));

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
