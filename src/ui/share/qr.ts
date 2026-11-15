import { encode } from 'uqr';

/** QR コードのモジュール行列を生成する (border: 0 を明示) */
export function qrMatrix(text: string, ecc: 'L' | 'M' = 'M'): boolean[][] {
  return encode(text, { ecc, border: 0 }).data;
}
