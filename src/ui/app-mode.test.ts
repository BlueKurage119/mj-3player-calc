import { describe, expect, it } from 'vitest';
import { isTileGalleryMode } from './app-mode';

describe('C3: アプリモード判定 (isTileGalleryMode)', () => {
  it('C3-T09: gallery=tiles が指定されていない場合は false を返す', () => {
    // 空文字
    expect(isTileGalleryMode('')).toBe(false);
    // 別のクエリパラメータ
    expect(isTileGalleryMode('?theme=dark')).toBe(false);
    // gallery が tiles 以外の値
    expect(isTileGalleryMode('?gallery=foo')).toBe(false);
  });

  it('C3-T10: gallery=tiles が指定されている場合は true を返す', () => {
    // 単独パラメータ
    expect(isTileGalleryMode('?gallery=tiles')).toBe(true);
    // 複数パラメータ
    expect(isTileGalleryMode('?theme=dark&gallery=tiles')).toBe(true);
  });
});
