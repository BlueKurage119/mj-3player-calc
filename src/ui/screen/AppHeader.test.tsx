import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { type AppAction, AppStateProvider } from '../state';
import {
  AppHeader,
  getHeaderMenuEntries,
  selectHeaderMenuItem
} from './AppHeader';

describe('F1-2: ヘッダーメニュー (ランダム14枚・ランダム清一色)', () => {
  it('F1-2-12: renderToStaticMarkup でメニュー項目と Divider の並び順が仕様どおり描画され、アイコンや補足説明がない', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AppHeader />
      </AppStateProvider>
    );

    const menuMatch = html.match(/<md-menu[^>]*>([\s\S]*?)<\/md-menu>/);
    expect(menuMatch).not.toBeNull();
    const menuInner = menuMatch?.[1] ?? '';

    const tokens = [
      ...menuInner.matchAll(
        /<md-divider[^>]*>(?:<\/md-divider>)?|<md-menu-item[^>]*>([\s\S]*?)<\/md-menu-item>/g
      )
    ];

    const actual = tokens.map(match => {
      const full = match[0];
      if (full.startsWith('<md-divider')) {
        return { kind: 'divider' as const };
      }
      const classMatch = full.match(/class="([^"]*)"/);
      return {
        kind: 'item' as const,
        className: classMatch?.[1] ?? '',
        innerHtml: match[1] ?? ''
      };
    });

    expect(actual).toEqual([
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">設定</div>'
      },
      { kind: 'divider' },
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">ランダム14枚</div>'
      },
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">ランダム清一色</div>'
      },
      { kind: 'divider' },
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">オールクリア</div>'
      }
    ]);
  });

  it('F1-2-13: getHeaderMenuEntries が設定・Divider・ランダム2項目・Divider・オールクリアを返す', () => {
    expect(getHeaderMenuEntries()).toEqual([
      { type: 'item', id: 'settings', label: '設定' },
      { type: 'divider' },
      { type: 'item', id: 'random14', label: 'ランダム14枚' },
      { type: 'item', id: 'chinitsu', label: 'ランダム清一色' },
      { type: 'divider' },
      { type: 'item', id: 'clear-all', label: 'オールクリア' }
    ]);
  });

  it('F1-2-14: selectHeaderMenuItem は closeMenu のあとに各項目に応じたアクションを dispatch する', () => {
    const callOrder: string[] = [];
    const closeMenu = vi.fn(() => {
      callOrder.push('close');
    });
    const dispatch = vi.fn<(action: AppAction) => void>(() => {
      callOrder.push('dispatch');
    });

    selectHeaderMenuItem('random14', closeMenu, dispatch);
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenNthCalledWith(1, {
      type: 'set-random-hand',
      kind: 'random14'
    });
    expect(callOrder).toEqual(['close', 'dispatch']);

    selectHeaderMenuItem('chinitsu', closeMenu, dispatch);
    expect(closeMenu).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: 'set-random-hand',
      kind: 'chinitsu'
    });

    selectHeaderMenuItem('settings', closeMenu, dispatch);
    expect(dispatch).toHaveBeenNthCalledWith(3, {
      type: 'navigate',
      screen: 'settings'
    });

    selectHeaderMenuItem('clear-all', closeMenu, dispatch);
    expect(dispatch).toHaveBeenNthCalledWith(4, {
      type: 'clear-all'
    });
  });
});
