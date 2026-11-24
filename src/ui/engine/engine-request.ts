// 確率・期待値の画面: AppState から EngineRequest と結果キーを組む純関数
import type { EngineOptions, EngineRequest } from '../../engine/types';
import type { AppState } from '../state';

/** 計算する巡目数(常に18。表示する巡目の選択では再計算しない) */
export const ENGINE_DRAWS = 18;

export interface EngineConditions {
  /** true = 「手替わりを詳しく」(M=1)、false = 「概算」(M=0。既定) */
  detailed: boolean;
  draws: number;
}

export const engineOptionsOf = (c: EngineConditions): EngineOptions => ({
  tegawari: true,
  backtrack: true,
  diffSlack: c.detailed ? 1 : 0,
  // 概算でも1向聴は詳細な計算にする(14枚入力でも所要時間は E-1 で確認済み)
  oneShantenSlack: true
});

export const buildEngineRequest = (
  id: number,
  state: Pick<AppState, 'table' | 'input' | 'rule'>,
  c: EngineConditions
): EngineRequest => ({
  id,
  table: state.table,
  input: state.input,
  rule: state.rule,
  remainingDraws: c.draws,
  options: engineOptionsOf(c)
});

/**
 * 結果の鮮度を判定するキー。要求に入る入力(手牌・副露・ドラ・裏ドラ・抜き北・状況・ルール)と
 * 計算方法を直列化する。表示巡目は含めない(表示の選択にすぎないため)
 */
export const engineKey = (
  state: Pick<AppState, 'table' | 'input' | 'rule'>,
  c: EngineConditions
): string =>
  JSON.stringify([
    state.table,
    state.input.hand,
    state.input.melds,
    state.input.dora,
    state.input.uradora,
    state.input.nuki,
    state.rule,
    engineOptionsOf(c),
    c.draws
  ]);
