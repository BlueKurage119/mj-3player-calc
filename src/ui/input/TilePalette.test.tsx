import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import type { Tile } from '../../core/tile';
import { type AppState, createInitialState } from '../state';

const holder: { state: AppState } = vi.hoisted(() => ({
  state: undefined as unknown as AppState
}));

vi.mock('../state', async importOriginal => {
  const actual = await importOriginal<typeof import('../state')>();
  return {
    ...actual,
    useAppState: () => holder.state,
    useAppDispatch: () => () => {}
  };
});

const { TilePalette } = await import('./TilePalette');

const p5: Tile = { type: 'p', n: 5, red: false };
const p5r: Tile = { type: 'p', n: 5, red: true };

const stateOf = (
  red: 0 | 1 | 2,
  focus: AppState['inputFocus'],
  melds: AppState['input']['melds'] = []
): AppState => {
  const base = createInitialState({ ...createDefaultRule(), red });
  return { ...base, input: { ...base.input, melds }, inputFocus: focus };
};

const render = (s: AppState): string => {
  holder.state = s;
  return renderToStaticMarkup(<TilePalette />);
};

const redKeys = (html: string): string[] =>
  html.match(/<button[^>]*aria-label="[^"]*赤(?!牌)[^"]*"/g) ?? [];

const toggleOf = (html: string): string => {
  const m = html.match(
    /<button[^>]*tile-palette__red-toggle[^>]*>[\s\S]*?<\/button>/
  );
  return m?.[0] ?? '';
};

describe('D4-C26: 副露シートのパレットの赤牌切替 (確定事項 25・31〜33)', () => {
  beforeEach(() => {
    holder.state = stateOf(1, null);
  });

  it('D4-C26a: red=1 の副露シートは切替ボタン1つ(span 2)で、赤5キー(赤5p・赤5s)が無い', () => {
    const html = render(
      stateOf(1, { type: 'meld', i: 0 }, [{ type: 'pon', tile: p5 }])
    );
    expect(html.match(/tile-palette__red-toggle/g)?.length).toBe(1);
    const btn = toggleOf(html);
    expect(btn).toContain('tile-palette__action--span-2');
    expect(btn).toContain('aria-label="赤牌"');
    expect(btn).toContain('aria-pressed="false"');
    expect(btn).toContain('×0');
    expect(btn).not.toContain('disabled');
    expect(redKeys(html)).toHaveLength(0);
  });

  it('D4-C26b: 赤ありのポンは aria-pressed=true と ×1(red=1)、red=2 の赤なしポンは ×1', () => {
    const pressed = toggleOf(
      render(stateOf(1, { type: 'meld', i: 0 }, [{ type: 'pon', tile: p5r }]))
    );
    expect(pressed).toContain('aria-pressed="true"');
    expect(pressed).toContain('×1');
    const two = toggleOf(
      render(stateOf(2, { type: 'meld', i: 0 }, [{ type: 'pon', tile: p5 }]))
    );
    expect(two).toContain('×1');
    expect(two).toContain('aria-pressed="false"');
  });

  it('D4-C26c: 槓・5 以外・未確定では disabled', () => {
    for (const meld of [
      { type: 'kan' as const, tile: p5, closed: false },
      { type: 'pon' as const, tile: { type: 'p' as const, n: 1 as const } },
      { type: 'pon' as const, tile: null }
    ]) {
      const btn = toggleOf(render(stateOf(1, { type: 'meld', i: 0 }, [meld])));
      expect(btn).toContain('disabled');
    }
  });

  it('D4-C26d: 手牌・ドラ・裏ドラのシートでは赤5キーが2つで切替ボタンは無い', () => {
    for (const focus of [
      { type: 'hand' as const },
      { type: 'dora' as const },
      { type: 'uradora' as const }
    ]) {
      const html = render(stateOf(1, focus));
      expect(html.includes('tile-palette__red-toggle')).toBe(false);
      expect(redKeys(html)).toHaveLength(2);
    }
  });

  it('D4-C26e: red=0 の副露シートは切替ボタンも赤5キーも無く、赤ありと同じ配置規則(span 3/4)', () => {
    const html = render(
      stateOf(0, { type: 'meld', i: 0 }, [{ type: 'pon', tile: p5 }])
    );
    expect(html.includes('tile-palette__red-toggle')).toBe(false);
    expect(redKeys(html)).toHaveLength(0);
    expect(html).toContain('tile-palette__action--span-4');
  });
});
