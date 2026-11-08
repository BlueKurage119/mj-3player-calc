import type { Input } from '../../core/input';
import { type Result, generateResult } from '../../core/result';
import type { AppState } from '../state';

export const computeResult = (
  s: Pick<AppState, 'table' | 'input' | 'handOptions' | 'rule'>
): Result => {
  const { uradora, ...restInput } = s.input;
  const coreInput: Input = {
    ...restInput,
    dora: [...s.input.dora, ...uradora]
  };
  return generateResult(s.table, coreInput, s.handOptions, s.rule);
};
