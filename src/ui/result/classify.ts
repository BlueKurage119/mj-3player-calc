import type { Discard, Result, ScoredHora } from '../../core/result';
import type { TileAvailability } from '../../core/tile';

export type ResultView =
  | { kind: 'none' } // result === null
  | { kind: 'just-hora' }
  | { kind: 'hora'; hora: ScoredHora[] } // hora-shanten / hora(13枚の聴牌・14枚の和了の両方)
  | { kind: 'tempai'; tileAvailabilities: TileAvailability[] } // tempai(打点なしの聴牌)
  | { kind: 'shanten'; shanten: number; tileAvailabilities: TileAvailability[] } // hora-shanten / shanten
  | { kind: 'discard'; discards: Discard[] }; // discard-shanten

export type ResultKind = ResultView['kind'];

export const classifyResult = (result: Result): ResultView => {
  if (result === null) {
    return { kind: 'none' };
  }
  if (result.type === 'just-hora') {
    return { kind: 'just-hora' };
  }
  if (result.type === 'tempai') {
    return { kind: 'tempai', tileAvailabilities: result.tileAvailabilities };
  }
  if (result.type === 'discard-shanten') {
    return { kind: 'discard', discards: result.discards };
  }
  if (result.type === 'hora-shanten') {
    if (result.info.type === 'hora') {
      return { kind: 'hora', hora: result.info.hora };
    }
    return {
      kind: 'shanten',
      shanten: result.info.shanten,
      tileAvailabilities: result.info.tileAvailabilities
    };
  }
  return { kind: 'none' };
};
