// 「時間がかかります」の判定(案t3-静的。数字は出さず、実行前に入力から判定する)
//
// 閾値 N と判定表の根拠(実測の出典は docs/research/issue-139-ui-build-record.md):
// 13枚は Issue 138 の製造記録 §2・§3、14枚は Issue 139 の製造冒頭の E-1・E-1b。
// 監修で見直すときは、この定数と SLOW_TABLE だけを直す

/** 所要時間がこれを超えそうな組み合わせで「時間がかかります」を出す(秒) */
export const SLOW_THRESHOLD_SEC = 5;

export interface SlowKey {
  /** true = 「手替わりを詳しく」(M=1) */
  detailed: boolean;
  size: 13 | 14;
  /** 開始向聴(13枚はその手の向聴、14枚は候補の最小向聴) */
  startShanten: number;
}

/**
 * 開始向聴(0〜3)ごとの「N 秒を超える」か。実測(中央値。Worker 内の計算時間):
 * - 13枚・概算(M=0): 3向聴でも 0.3〜0.7 秒 → 該当なし
 * - 13枚・詳しく(M=1): 2向聴 2.0 秒、3向聴 10.8 秒 → 3向聴だけ該当
 * - 14枚・概算: 開始向聴1で 0.4〜1.4 秒、2で 2.1〜7.8 秒(4手中2手が 5 秒超)、3で 0.9 秒 → 2だけ該当
 * - 14枚・詳しく: 1で 23 秒、2で 69〜139 秒、3で 51 秒 → 1〜3が該当(0 は 0.8 秒の2手のみの測定で非該当)
 */
const SLOW_TABLE: Record<
  'm0-13' | 'm1-13' | 'm0-14' | 'm1-14',
  readonly [boolean, boolean, boolean, boolean]
> = {
  'm0-13': [false, false, false, false],
  'm1-13': [false, false, false, true],
  'm0-14': [false, false, true, false],
  'm1-14': [false, true, true, true]
};

export const isSlowRun = (k: SlowKey): boolean => {
  const key = `${k.detailed ? 'm1' : 'm0'}-${k.size}` as const;
  return SLOW_TABLE[key][Math.min(3, Math.max(0, k.startShanten))] ?? false;
};
