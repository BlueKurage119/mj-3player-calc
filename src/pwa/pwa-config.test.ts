import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT_DIR = path.resolve(__dirname, '../..');
const VITE_CONFIG_PATH = path.join(ROOT_DIR, 'vite.config.ts');

describe('VitePWA 設定の静的検査 (Issue #166)', () => {
  it('166-T11: vite.config.ts で待機型 SW（prompt / injectRegister: false / skipWaiting: false / clientsClaim: false / cleanupOutdatedCaches: true）が設定されている', () => {
    const raw = fs.readFileSync(VITE_CONFIG_PATH, 'utf8');
    // コメントを除去して誤検出を防ぐ
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    const pwaStart = stripped.indexOf('VitePWA(');
    expect(pwaStart).toBeGreaterThan(-1);
    const pwaSection = stripped.slice(pwaStart);

    // 理由: VitePWA オプションブロック内の各設定キーと値が仕様どおりであることを個別に検証するため部分一致を使う
    expect(pwaSection).toMatch(/registerType:\s*'prompt'/);
    expect(pwaSection).toMatch(/injectRegister:\s*false/);
    expect(pwaSection).toMatch(/skipWaiting:\s*false/);
    expect(pwaSection).toMatch(/clientsClaim:\s*false/);
    expect(pwaSection).toMatch(/cleanupOutdatedCaches:\s*true/);
    expect(pwaSection).not.toMatch(/registerType:\s*'autoUpdate'/);
    expect(pwaSection).not.toMatch(/skipWaiting:\s*true/);
    expect(pwaSection).not.toMatch(/clientsClaim:\s*true/);
  });
});
