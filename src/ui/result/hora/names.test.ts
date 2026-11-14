import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { YAKU_LABELS, YAKUMAN_LABELS } from './labels';

describe('labels.ts (E2 名前と表のテスト)', () => {
  it('E2-1: YAKU_LABELS のキーが yakuNames と一致し、空文字が存在しない', async () => {
    const { yakuNames } = await import('../../../core/yaku');
    const labelKeys = Object.keys(YAKU_LABELS).sort();
    const expectedKeys = [...yakuNames].sort();

    expect(labelKeys).toEqual(expectedKeys);
    for (const key of yakuNames) {
      expect(YAKU_LABELS[key]).toBeTruthy();
      expect(typeof YAKU_LABELS[key]).toBe('string');
    }
  });

  it('E2-2: YAKUMAN_LABELS のキーが yakumanNames と一致し、空文字が存在しない', async () => {
    const { yakumanNames } = await import('../../../core/yaku');
    const labelKeys = Object.keys(YAKUMAN_LABELS).sort();
    const expectedKeys = [...yakumanNames].sort();

    expect(labelKeys).toEqual(expectedKeys);
    for (const key of yakumanNames) {
      expect(YAKUMAN_LABELS[key]).toBeTruthy();
      expect(typeof YAKUMAN_LABELS[key]).toBe('string');
    }
  });

  it('E2-3: 代表的な役名が正本の表記と一致する', () => {
    expect(YAKU_LABELS['ura-dora']).toBe('裏ドラ');
    expect(YAKU_LABELS['nuki-dora']).toBe('抜きドラ');
    expect(YAKU_LABELS.north).toBe('北');
    expect(YAKU_LABELS.chankan).toBe('槍槓');
    expect(YAKU_LABELS.haitei).toBe('海底撈月');
    expect(YAKUMAN_LABELS['suanko-tanki']).toBe('四暗刻単騎');
  });

  it('E2-4: labels.ts に function, =>, if, ? のトークンが含まれずデータのみである', () => {
    const filePath = resolve(__dirname, 'labels.ts');
    const content = readFileSync(filePath, 'utf-8');

    // コメント行を除外してチェック
    const codeLines = content
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, '').trim())
      .filter(Boolean);
    const codeOnly = codeLines.join('\n');

    expect(codeOnly).not.toMatch(/\bfunction\b/);
    expect(codeOnly).not.toMatch(/=>/);
    expect(codeOnly).not.toMatch(/\bif\b/);
    expect(codeOnly).not.toMatch(/\?/);
  });
});
