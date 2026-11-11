import { describe, expect, it } from 'vitest';
import type { Discard, Result, ScoredHora } from '../../core/result';
import type { TileAvailability } from '../../core/tile';
import { classifyResult } from './classify';

describe('classifyResult', () => {
  it('null のときは kind: "none" を返す', () => {
    expect(classifyResult(null)).toEqual({ kind: 'none' });
  });

  it('just-hora のときは kind: "just-hora" を返す', () => {
    const result: Result = { type: 'just-hora' };
    expect(classifyResult(result)).toEqual({ kind: 'just-hora' });
  });

  it('tempai のときは kind: "tempai" と同一参照の tileAvailabilities を返す', () => {
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 's', n: 5, red: false }, count: 1 }
    ];
    const result: Result = {
      type: 'tempai',
      tileAvailabilities
    };
    const classified = classifyResult(result);
    expect(classified).toEqual({
      kind: 'tempai',
      tileAvailabilities
    });
    if (classified.kind === 'tempai') {
      expect(classified.tileAvailabilities).toBe(tileAvailabilities);
    }
  });

  it('discard-shanten のときは kind: "discard" と同一参照の discards を返す', () => {
    const discards: Discard[] = [
      {
        tile: { type: 'm', n: 1, red: false },
        next: { type: 'tempai', tileAvailabilities: [] }
      }
    ];
    const result: Result = {
      type: 'discard-shanten',
      discards
    };
    const classified = classifyResult(result);
    expect(classified).toEqual({
      kind: 'discard',
      discards
    });
    if (classified.kind === 'discard') {
      expect(classified.discards).toBe(discards);
    }
  });

  it('hora-shanten で info.type が hora のとき(0件) kind: "hora" と同一参照の hora を返す', () => {
    const hora: ScoredHora[] = [];
    const result: Result = {
      type: 'hora-shanten',
      info: {
        type: 'hora',
        hora
      }
    };
    const classified = classifyResult(result);
    expect(classified).toEqual({
      kind: 'hora',
      hora
    });
    if (classified.kind === 'hora') {
      expect(classified.hora).toBe(hora);
    }
  });

  it('hora-shanten で info.type が hora のとき(複数件) kind: "hora" と同一参照の hora を返す', () => {
    const mockHoraItem = {
      horaTile: { type: 'm', n: 1, red: false },
      options: { tsumo: true },
      score: {}
    } as unknown as ScoredHora;
    const hora: ScoredHora[] = [mockHoraItem, { ...mockHoraItem }];
    const result: Result = {
      type: 'hora-shanten',
      info: {
        type: 'hora',
        hora
      }
    };
    const classified = classifyResult(result);
    expect(classified).toEqual({
      kind: 'hora',
      hora
    });
    if (classified.kind === 'hora') {
      expect(classified.hora).toBe(hora);
    }
  });

  it('hora-shanten で info.type が shanten のとき kind: "shanten" と shanten, 同一参照の tileAvailabilities を返す', () => {
    const tileAvailabilities: TileAvailability[] = [
      { tile: { type: 'p', n: 1, red: false }, count: 4 }
    ];
    const result: Result = {
      type: 'hora-shanten',
      info: {
        type: 'shanten',
        shanten: 2,
        tileAvailabilities
      }
    };
    const classified = classifyResult(result);
    expect(classified).toEqual({
      kind: 'shanten',
      shanten: 2,
      tileAvailabilities
    });
    if (classified.kind === 'shanten') {
      expect(classified.tileAvailabilities).toBe(tileAvailabilities);
      expect(classified.shanten).toBe(2);
    }
  });
});
