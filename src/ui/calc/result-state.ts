import type { ShisanputaNotice } from '../../core/local-yaku';
import type { Result } from '../../core/result';
import type { AppState } from '../state';
import type { computeResult, computeShisanputaNotice } from './compute';

export type ResultState =
  | { status: 'loading' }
  | { status: 'ok'; result: Result; shisanputa?: ShisanputaNotice }
  | { status: 'error'; error: unknown };

export type ComputeFn = typeof computeResult;
export type ShisanputaNoticeFn = typeof computeShisanputaNotice;

export const evaluateResult = (
  compute: ComputeFn | null, // null = 計算部の読み込み前
  loadError: unknown | null, // 動的 import の失敗
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>,
  noticeFn?: ShisanputaNoticeFn | null
): ResultState => {
  if (loadError !== null) {
    return { status: 'error', error: loadError };
  }
  if (compute === null) {
    return { status: 'loading' };
  }
  try {
    const result = compute(s);
    const shisanputa = noticeFn ? noticeFn(s) : null;
    return shisanputa !== null
      ? { status: 'ok', result, shisanputa }
      : { status: 'ok', result };
  } catch (error) {
    return { status: 'error', error };
  }
};
