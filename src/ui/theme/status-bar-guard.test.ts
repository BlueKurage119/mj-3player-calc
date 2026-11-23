import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Issue #158 M2: status-bar-guard.css の規約検査(文字列)
const css = readFileSync(join(__dirname, 'status-bar-guard.css'), 'utf8');
// コメントは検査対象から除く(コメント中の説明語で誤検知しないため)
const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
const baseRule = /\.status-bar-guard\s*\{([^}]*)\}/.exec(body)?.[1] ?? '';
const previewRule =
  /:root\[data-app-env=['"]preview['"]\]\s+\.status-bar-guard\s*\{([^}]*)\}/.exec(
    body
  )?.[1] ?? '';

describe('status-bar-guard.css (Issue #158 M2)', () => {
  it('ガード要素の必須宣言を全て含む', () => {
    expect(baseRule).toMatch(/position:\s*fixed;/);
    expect(baseRule).toMatch(/top:\s*0;/);
    expect(baseRule).toMatch(/z-index:\s*0;/);
    expect(baseRule).toMatch(/pointer-events:\s*none;/);
    expect(baseRule).toMatch(/height:\s*max\(/);
    expect(baseRule).toMatch(/(?<!-webkit-)background-clip:\s*text;/);
    expect(baseRule).toMatch(/-webkit-background-clip:\s*text;/);
    expect(baseRule).toMatch(
      /background-color:\s*var\(--md-sys-color-surface-container\);/
    );
  });

  it('プレビュー時は quaternary を使う', () => {
    expect(previewRule).toMatch(
      /background-color:\s*var\(--md-sys-color-quaternary\);/
    );
  });

  it('判定から外れる宣言とHEX直書きを含まない', () => {
    expect(body).not.toMatch(/opacity\s*:/);
    expect(body).not.toMatch(/visibility\s*:/);
    expect(body).not.toMatch(/display\s*:\s*none/);
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
