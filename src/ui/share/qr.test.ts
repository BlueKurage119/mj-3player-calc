import { describe, expect, it, vi } from 'vitest';

const encodeSpy = vi.fn(() => ({
  version: 1,
  size: 21,
  maskPattern: 0,
  data: Array.from({ length: 21 }, () => Array<boolean>(21).fill(false)),
  types: []
}));

vi.mock('uqr', () => ({
  encode: encodeSpy
}));

const { qrMatrix } = await import('./qr');

describe('qrMatrix (H2-AC14)', () => {
  it('H2-AC14: qrMatrix は uqr の encode に border: 0 と ecc: M を渡す', () => {
    const result = qrMatrix('https://bluekurage119.github.io/mj-3player-calc/');
    expect(encodeSpy).toHaveBeenCalledTimes(1);
    expect(encodeSpy).toHaveBeenCalledWith(
      'https://bluekurage119.github.io/mj-3player-calc/',
      { ecc: 'M', border: 0 }
    );
    expect(result.length).toBe(21);
  });

  it('H2-AC14: qrMatrix は ecc 引数 L を encode に引き渡す', () => {
    encodeSpy.mockClear();
    qrMatrix('https://example.com/', 'L');
    expect(encodeSpy).toHaveBeenCalledWith('https://example.com/', {
      ecc: 'L',
      border: 0
    });
  });
});
