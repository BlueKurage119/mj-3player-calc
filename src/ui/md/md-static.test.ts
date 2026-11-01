import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SRC_DIR = path.join(REPO_ROOT, 'src');

function getAllFiles(
  dir: string,
  filter: (filePath: string) => boolean
): string[] {
  const result: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...getAllFiles(fullPath, filter));
    } else if (entry.isFile() && filter(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

describe('C2: Material Web 静的検査 (C2-S01〜S04)', () => {
  it('C2-S01: <md- 生タグは src/ui/md 配下 (MdGallery.tsx を除く) にのみ存在する', () => {
    const sourceFiles = getAllFiles(
      SRC_DIR,
      p =>
        (p.endsWith('.ts') || p.endsWith('.tsx')) &&
        !p.endsWith('.test.ts') &&
        !p.endsWith('.test.tsx') &&
        !p.endsWith('jsx.d.ts')
    );

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const isMdWrapper =
        relPath.startsWith('src/ui/md/') && !relPath.endsWith('MdGallery.tsx');

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        if (/<md-[a-z0-9-]+/i.test(lineText)) {
          if (!isMdWrapper) {
            violations.push({
              file: relPath,
              line: idx + 1,
              text: lineText.trim()
            });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('C2-S02: CSS 以外の副作用 bare import が存在しない', () => {
    const sourceFiles = getAllFiles(
      SRC_DIR,
      p =>
        (p.endsWith('.ts') || p.endsWith('.tsx')) &&
        !p.endsWith('.test.ts') &&
        !p.endsWith('.test.tsx')
    );

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        const trimmed = lineText.trim();
        // import '...' または import "..."
        if (/^import\s+['"][^'"]+['"]\s*;?$/.test(trimmed)) {
          // .css は許可
          if (!/\.css['"]\s*;?$/.test(trimmed)) {
            violations.push({
              file: relPath,
              line: idx + 1,
              text: trimmed
            });
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('C2-S03: @material/web/all および labs/ の import が存在しない', () => {
    const sourceFiles = getAllFiles(
      SRC_DIR,
      p =>
        (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.css')) &&
        !p.endsWith('.test.ts') &&
        !p.endsWith('.test.tsx')
    );

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((lineText, idx) => {
        if (
          lineText.includes('@material/web/all') ||
          lineText.includes('labs/')
        ) {
          violations.push({
            file: relPath,
            line: idx + 1,
            text: lineText.trim()
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('C2-S04: @lit/react の import および依存が存在しない', () => {
    const pkgPath = path.join(REPO_ROOT, 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
    expect(pkgContent).not.toContain('@lit/react');

    const sourceFiles = getAllFiles(
      SRC_DIR,
      p =>
        (p.endsWith('.ts') || p.endsWith('.tsx')) &&
        !p.endsWith('.test.ts') &&
        !p.endsWith('.test.tsx')
    );

    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('@lit/react')) {
        violations.push({ file: relPath, line: 0, text: '@lit/react found' });
      }
    }

    expect(violations).toEqual([]);
  });
});
