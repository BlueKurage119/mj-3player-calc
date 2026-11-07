import type { Result } from '../../core/result';
import type { AppState } from '../state';
import type { computeResult } from './compute';

export type ResultState =
  | { status: 'loading' }
  | { status: 'ok'; result: Result }
  | { status: 'error'; error: unknown };

export type ComputeFn = typeof computeResult;

export const evaluateResult = (
  compute: ComputeFn | null, // null = 計算部の読み込み前
  loadError: unknown | null, // 動的 import の失敗
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): ResultState => {
  if (loadError !== null) {
    return { status: 'error', error: loadError };
  }
  if (compute === null) {
    return { status: 'loading' };
  }
  try {
    const result = compute(s);
    return { status: 'ok', result };
  } catch (error) {
    return { status: 'error', error };
  }
};
