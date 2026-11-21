import { type ShisanputaNotice, shisanputaNotice } from '../../core/local-yaku';
import { type Result, generateResult } from '../../core/result';
import type { AppState } from '../state';

export const computeResult = (
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): Result => generateResult(s.table, s.input, s.handOptions, s.rule);

export const computeShisanputaNotice = (
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): ShisanputaNotice =>
  shisanputaNotice(s.table, s.input, s.handOptions, s.rule);
