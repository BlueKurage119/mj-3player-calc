import { describe, expect, it } from 'vitest';
import {
  isMdGalleryMode,
  isTileGalleryMode,
  readThemeOverride
} from './app-mode';

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

describe('C2: アプリモードとテーマ上書き判定 (isMdGalleryMode / readThemeOverride)', () => {
  it('C2-T03: isMdGalleryMode の判定', () => {
    expect(isMdGalleryMode('')).toBe(false);
    expect(isMdGalleryMode('?gallery=tiles')).toBe(false);
    expect(isMdGalleryMode('?gallery=foo')).toBe(false);
    expect(isMdGalleryMode('?gallery=md')).toBe(true);
    expect(isMdGalleryMode('?theme=dark&gallery=md')).toBe(true);
  });

  it('C2-T04: readThemeOverride の判定', () => {
    expect(readThemeOverride('')).toBeNull();
    expect(readThemeOverride('?theme=dark')).toBe('dark');
    expect(readThemeOverride('?theme=light')).toBe('light');
    expect(readThemeOverride('?theme=auto')).toBe('auto');
    expect(readThemeOverride('?theme=DARK')).toBeNull();
    expect(readThemeOverride('?theme=foo')).toBeNull();
    expect(readThemeOverride('?gallery=md&theme=dark')).toBe('dark');
  });
});
