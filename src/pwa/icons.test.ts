import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '../..');
const ICONS_DIR = path.resolve(ROOT_DIR, 'public/icons');
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

interface PngIhdrInfo {
  width: number;
  height: number;
  colorType: number;
}

function readPngIhdr(filePath: string): PngIhdrInfo {
  const buf = fs.readFileSync(filePath);
  const chunkType = buf.subarray(12, 16).toString('ascii');
  if (chunkType !== 'IHDR') {
    throw new Error(`PNG の先頭チャンクが IHDR ではありません: ${chunkType}`);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf[25] ?? -1
  };
}

const EXPECTED_PNGS = [
  { file: 'icon-192.png', size: 192, allowedColorTypes: [2, 6] },
  { file: 'icon-512.png', size: 512, allowedColorTypes: [2, 6] },
  { file: 'icon-maskable-512.png', size: 512, allowedColorTypes: [2, 6] },
  { file: 'apple-touch-icon-180.png', size: 180, allowedColorTypes: [2] }
] as const;

describe('PWA アイコン生成物 (G1-T3〜T6)', () => {
  it('G1-T3: public/icons/ の4ファイルが存在し、先頭8バイトが PNG シグネチャである', () => {
    for (const entry of EXPECTED_PNGS) {
      const target = path.resolve(ICONS_DIR, entry.file);
      expect(fs.existsSync(target)).toBe(true);
      const buf = fs.readFileSync(target);
      expect(Array.from(buf.subarray(0, 8))).toEqual(PNG_SIGNATURE);
    }
  });

  it('G1-T4: 各 PNG の IHDR の幅・高さがファイル名どおりである', () => {
    for (const entry of EXPECTED_PNGS) {
      const ihdr = readPngIhdr(path.resolve(ICONS_DIR, entry.file));
      expect({ width: ihdr.width, height: ihdr.height }).toEqual({
        width: entry.size,
        height: entry.size
      });
    }
  });

  it('G1-T5: apple-touch-icon-180.png の IHDR カラータイプが 2 で、他3ファイルは 2 または 6 である', () => {
    for (const entry of EXPECTED_PNGS) {
      const ihdr = readPngIhdr(path.resolve(ICONS_DIR, entry.file));
      if (entry.file === 'apple-touch-icon-180.png') {
        expect(ihdr.colorType).toBe(2);
      } else {
        // 設計書 §7 G1-T5 により RGB(2) または RGBA(6) の両方を許容するため配列包含で検証
        expect(entry.allowedColorTypes).toContain(ihdr.colorType);
      }
    }
  });

  it('G1-T6: public/favicon.svg が assets-src/icon/icon.svg のプレースホルダを解決した内容と一致する', () => {
    const sourceIconSvg = fs.readFileSync(
      path.resolve(ROOT_DIR, 'assets-src/icon/icon.svg'),
      'utf-8'
    );
    // tokens.css のライト確定値から独立に期待値を構築する
    const expectedFaviconSvg = sourceIconSvg
      .replaceAll('var(--md-sys-color-primary-container)', '#bcf0b4')
      .replaceAll('var(--md-sys-color-surface-container-lowest)', '#ffffff')
      .replaceAll('var(--md-sys-color-on-primary-container)', '#245023');
    const actualFaviconSvg = fs.readFileSync(
      path.resolve(ROOT_DIR, 'public/favicon.svg'),
      'utf-8'
    );

    expect(actualFaviconSvg).toBe(expectedFaviconSvg);
  });
});
