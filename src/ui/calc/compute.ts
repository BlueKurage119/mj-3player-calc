import { type Result, generateResult } from '../../core/result';
import type { AppState } from '../state';

export const computeResult = (
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): Result => generateResult(s.table, s.input, s.handOptions, s.rule);
