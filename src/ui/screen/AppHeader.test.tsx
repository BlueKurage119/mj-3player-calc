import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultRule } from '../../core/rule';
import { EngineView } from '../engine/EngineView';
import { Dialog } from '../md';
import { type AppAction, AppStateProvider } from '../state';
import {
  AppHeader,
  getHeaderMenuEntries,
  selectHeaderMenuItem
} from './AppHeader';
import { HelpView } from './HelpScreen';
import { LicenseView } from './LicenseScreen';
import { ScoringTableView } from './ScoringTableScreen';
import { SettingsScreen } from './SettingsScreen';

vi.mock('../theme/use-theme', () => ({
  useTheme: () => ({
    preference: 'auto',
    resolved: 'light',
    setPreference: () => {}
  })
}));

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
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">点数計算表</div>'
      },
      {
        kind: 'item',
        className: 'app-header__menu-item',
        innerHtml: '<div slot="headline">ヘルプ</div>'
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

  it('F1-2-13: getHeaderMenuEntries が設定・点数計算表・ヘルプ・Divider・ランダム2項目・Divider・オールクリアを返す', () => {
    expect(getHeaderMenuEntries()).toEqual([
      { type: 'item', id: 'settings', label: '設定' },
      { type: 'item', id: 'scoring-table', label: '点数計算表' },
      { type: 'item', id: 'help', label: 'ヘルプ' },
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

    selectHeaderMenuItem('scoring-table', closeMenu, dispatch);
    expect(dispatch).toHaveBeenNthCalledWith(5, {
      type: 'navigate',
      screen: 'scoring-table'
    });
  });
});

describe('G4: ヘッダーメニュー (ヘルプ)', () => {
  it('G4-T1: getHeaderMenuEntries が設計書 3.4 の並び(divider を含む)と完全一致する', () => {
    expect(getHeaderMenuEntries()).toEqual([
      { type: 'item', id: 'settings', label: '設定' },
      { type: 'item', id: 'scoring-table', label: '点数計算表' },
      { type: 'item', id: 'help', label: 'ヘルプ' },
      { type: 'divider' },
      { type: 'item', id: 'random14', label: 'ランダム14枚' },
      { type: 'item', id: 'chinitsu', label: 'ランダム清一色' },
      { type: 'divider' },
      { type: 'item', id: 'clear-all', label: 'オールクリア' }
    ]);
  });

  it('G4-T2: selectHeaderMenuItem で help を選ぶとメニューを閉じて help 画面へ遷移する action を dispatch する', () => {
    const callOrder: string[] = [];
    const closeMenu = vi.fn(() => {
      callOrder.push('close');
    });
    const dispatch = vi.fn<(action: AppAction) => void>(() => {
      callOrder.push('dispatch');
    });

    selectHeaderMenuItem('help', closeMenu, dispatch);
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'navigate',
      screen: 'help'
    });
    expect(callOrder).toEqual(['close', 'dispatch']);
  });
});

describe('プレビュー識別バッジ (CR-T5)', () => {
  it('CR-T5: 通常のテスト環境(非プレビュー)で AppHeader をレンダリングしたとき、プレビューバッジが含まれない', () => {
    const html = renderToStaticMarkup(
      <AppStateProvider>
        <AppHeader />
      </AppStateProvider>
    );

    // レンダリング結果の HTML 全体に対象クラスと文言が含まれないことを検証するため、否定の部分一致を使用する
    expect(html).not.toContain('app-header__preview-badge');
    expect(html).not.toContain('プレビュー');
  });
});

describe('ヘッダー下端部の仕上げ改善 (Issue #142)', () => {
  const mainCss = readFileSync(
    new URL('./main-screen.css', import.meta.url),
    'utf8'
  );
  const engineCss = readFileSync(
    new URL('../engine/engine.css', import.meta.url),
    'utf8'
  );
  const scoringTableCss = readFileSync(
    new URL('./scoring-table.css', import.meta.url),
    'utf8'
  );
  const bottomSheetCss = readFileSync(
    new URL('../expressive/bottom-sheet.css', import.meta.url),
    'utf8'
  );
  const strippedMainCss = mainCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const strippedEngineCss = engineCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const strippedScoringCss = scoringTableCss.replace(/\/\*[\s\S]*?\*\//g, '');
  const strippedBottomSheetCss = bottomSheetCss.replace(
    /\/\*[\s\S]*?\*\//g,
    ''
  );

  it('Issue142-C1: .app-header が on-scroll トーン変化と常時表示の下端フェード・prefers-reduced-motion を持つ', () => {
    const headerBlock =
      strippedMainCss.match(/\.app-header\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(headerBlock).not.toBe('');
    // 理由: .app-header 定義ブロック内に必須プロパティ・トークンが含まれることを検証するため部分一致を使う
    expect(headerBlock).toContain(
      '--app-header-bg: var(--md-sys-color-surface);'
    );
    // 理由: 境界線・影を持たないことを検証するため否定の部分一致を使う
    expect(headerBlock).not.toContain('border-bottom');
    // 理由: box-shadow を持たないことを検証するため否定の部分一致を使う
    expect(headerBlock).not.toContain('box-shadow');
    // 理由: トランジションに MD3 fast effects トークンを使用していることを検証するため部分一致を使う
    expect(headerBlock).toContain(
      'transition-duration: var(--md-sys-motion-spring-effects-fast-duration);'
    );
    // 理由: トランジションイージングに MD3 fast effects トークンを使用していることを検証するため部分一致を使う
    expect(headerBlock).toContain(
      'transition-timing-function: var(--md-sys-motion-spring-effects-fast-easing);'
    );

    const scrolledBlock =
      strippedMainCss.match(
        /\.app-header\[data-scrolled="true"\]\s*\{([^}]*)\}/
      )?.[1] ?? '';
    expect(scrolledBlock.trim()).toBe(
      '--app-header-bg: var(--md-sys-color-surface-container);'
    );

    const afterMatch = strippedMainCss.match(
      /\.app-header::after\s*\{([^}]*)\}/
    );
    const afterBlock = afterMatch?.[1] ?? '';
    expect(afterBlock).not.toBe('');
    // 理由: ::after 擬似要素の各 CSS 宣言を検証するため部分一致を使う
    expect(afterBlock).toContain('position: absolute;');
    // 理由: ヘッダー直下に配置されることを検証するため部分一致を使う
    expect(afterBlock).toContain('top: 100%;');
    // 理由: 下層コンテンツの操作を阻害しないことを検証するため部分一致を使う
    expect(afterBlock).toContain('pointer-events: none;');
    // 理由: ヘッダー内要素より背面に描画されることを検証するため部分一致を使う
    expect(afterBlock).toContain('z-index: -1;');
    // 理由: 本体背景と同期した色変数を参照することを検証するため部分一致を使う
    expect(afterBlock).toContain('background-color: var(--app-header-bg);');
    // 理由: -webkit-mask-image でグラデーションフェードすることを検証するため部分一致を使う
    expect(afterBlock).toContain('-webkit-mask-image: linear-gradient(');
    // 理由: mask-image でグラデーションフェードすることを検証するため部分一致を使う
    expect(afterBlock).toContain('mask-image: linear-gradient(');
    // 理由: 常時表示であり opacity: 0 で非表示にしないことを検証するため否定の部分一致を使う
    expect(afterBlock).not.toContain('opacity: 0');
    // 理由: ::after も本体と同じトランジション時間トークンを持つことを検証するため部分一致を使う
    expect(afterBlock).toContain(
      'transition-duration: var(--md-sys-motion-spring-effects-fast-duration);'
    );

    const afterIndex = afterMatch?.index ?? -1;
    const afterTail = strippedMainCss.slice(afterIndex);
    const reducedMotionMatch = afterTail.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?\})\s*\}/
    );
    const reducedBlock = reducedMotionMatch?.[1] ?? '';
    // 理由: .app-header::after の直後に .app-header, .app-header::after { transition: none; } があることを検証するため部分一致を使う
    expect(reducedBlock).toContain('.app-header,');
    // 理由: .app-header::after が transition: none 対象に含まれることを検証するため部分一致を使う
    expect(reducedBlock).toContain('.app-header::after');
    // 理由: transition: none が指定されていることを検証するため部分一致を使う
    expect(reducedBlock).toContain('transition: none;');
  });

  it('Issue142-C2: .input-section に上端余白 0.75rem があり .main-screen に上端余白がない', () => {
    const inputSectionBlock =
      strippedMainCss.match(/\.input-section\s*\{([^}]*)\}/)?.[1] ?? '';
    // 理由: .input-section に padding-block-start: 0.75rem が設定されていることを検証するため部分一致を使う
    expect(inputSectionBlock).toContain('padding-block-start: 0.75rem;');

    const mainScreenBlock =
      strippedMainCss.match(/\.main-screen\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(mainScreenBlock).not.toBe('');
    // 理由: SettingsScreen と共用する .main-screen に上端余白が追加されていないことを検証するため否定の部分一致を使う
    expect(mainScreenBlock).not.toContain('padding-top');
    // 理由: SettingsScreen と共用する .main-screen に padding-block-start が無いことを検証するため否定の部分一致を使う
    expect(mainScreenBlock).not.toContain('padding-block-start');
    // 理由: SettingsScreen と共用する .main-screen に padding-block が無いことを検証するため否定の部分一致を使う
    expect(mainScreenBlock).not.toContain('padding-block');
  });

  it('Issue142-C3: scoring-table.css に .scoring-table-screen .app-header の border-bottom 定義が存在しない', () => {
    const scoringHeaderBlock = strippedScoringCss.match(
      /\.scoring-table-screen\s+\.app-header\s*\{[^}]*\}/
    );
    expect(scoringHeaderBlock).toBeNull();
  });

  it('Issue142-H1: 全6画面の <header> に class="app-header" data-scrolled="false" が出力される', () => {
    const noop = () => {};
    const defaultRule = createDefaultRule();

    const screens: readonly { name: string; html: string }[] = [
      {
        name: 'AppHeader',
        html: renderToStaticMarkup(
          <AppStateProvider>
            <AppHeader />
          </AppStateProvider>
        )
      },
      {
        name: 'EngineView',
        html: renderToStaticMarkup(
          <EngineView
            onBack={noop}
            onOpenHelp={noop}
            hand={[{ type: 'z', n: 1 }]}
            melds={[]}
            premise={{
              table: { round: 'east', seat: 'east', continue: 0, deposit: 0 },
              dora: [],
              nuki: 0,
              nukiEnabled: true
            }}
            available={true}
            methodChoice={true}
            detailed={false}
            onDetailedChange={noop}
            slow={false}
            run={{ status: 'idle' }}
            onRun={noop}
            onCancel={noop}
            result={{
              displayTurn: 3,
              onTurnChange: noop,
              rankMetric: 'ev',
              onRankMetricChange: noop
            }}
          />
        )
      },
      {
        name: 'ScoringTableView',
        html: renderToStaticMarkup(
          <ScoringTableView seat="east" rule={defaultRule} onBack={noop} />
        )
      },
      {
        name: 'SettingsScreen',
        html: renderToStaticMarkup(
          <AppStateProvider>
            <SettingsScreen />
          </AppStateProvider>
        )
      },
      {
        name: 'HelpView',
        html: renderToStaticMarkup(
          <HelpView onBack={noop} onOpenLicense={noop} />
        )
      },
      {
        name: 'LicenseView',
        html: renderToStaticMarkup(<LicenseView onBack={noop} />)
      }
    ];

    for (const screen of screens) {
      const headerTag = screen.html.match(/<header\b[^>]*>/)?.[0] ?? '';
      expect(headerTag, `${screen.name} の <header>`).toBe(
        '<header class="app-header" data-scrolled="false">'
      );
    }
  });

  it('Issue142-Z1: 固定カード(.summary-card / .engine-card)が .app-header より前面(18 > 15)で、.result-banner(19)・.bottom-sheet(20)より背面にある', () => {
    const headerBlock =
      strippedMainCss.match(/\.app-header\s*\{([^}]*)\}/)?.[1] ?? '';
    const summaryBlock =
      strippedMainCss.match(/\.summary-card\s*\{([^}]*)\}/)?.[1] ?? '';
    const resultBannerBlock =
      strippedMainCss.match(/\.result-banner\s*\{([^}]*)\}/)?.[1] ?? '';
    const bottomSheetBlock =
      strippedBottomSheetCss.match(/\.bottom-sheet\s*\{([^}]*)\}/)?.[1] ?? '';
    const engineCardBlock =
      strippedEngineCss.match(/\.engine-card\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(headerBlock.match(/z-index:\s*(\d+)/)?.[1]).toBe('15');
    expect(summaryBlock.match(/z-index:\s*(\d+)/)?.[1]).toBe('18');
    expect(engineCardBlock.match(/z-index:\s*(\d+)/)?.[1]).toBe('18');
    expect(resultBannerBlock.match(/z-index:\s*(\d+)/)?.[1]).toBe('19');
    expect(bottomSheetBlock.match(/z-index:\s*(\d+)/)?.[1]).toBe('20');
  });

  it('Issue142-C4: scoring-table.css がスクロール時のラベル・未選択トグル背景色と transition(角丸モーフ両立・reduced-motion)を持つ', () => {
    // 理由: スクロール時の背景色トークン指定が点数計算表 CSS に含まれることを検証するため部分一致を使う
    expect(strippedScoringCss).toContain(
      '.scoring-table-screen\n  .app-header[data-scrolled="true"]\n  .scoring-table-screen__rule-label[data-tsumo-loss="loss"]'
    );
    // 理由: 未選択トグルのスクロール時セレクタが含まれることを検証するため部分一致を使う
    expect(strippedScoringCss).toContain(
      '.scoring-table-screen\n  .app-header[data-scrolled="true"]\n  .connected-button[aria-checked="false"]'
    );
    // 理由: 背景色が surface-container-highest に切り替わることを検証するため部分一致を使う
    expect(strippedScoringCss).toContain(
      'background-color: var(--md-sys-color-surface-container-highest);'
    );
    // 理由: .connected-button の border-radius モーフ遷移を壊さず background-color 遷移と両立していることを検証するため部分一致を使う
    expect(strippedScoringCss).toContain(
      'border-radius var(--md-sys-motion-spring-spatial-fast-duration)'
    );
    // 理由: background-color 遷移に fast effects トークンを使用していることを検証するため空白正規化うえで部分一致を使う
    expect(strippedScoringCss.replace(/\s+/g, ' ')).toContain(
      'background-color var(--md-sys-motion-spring-effects-fast-duration)'
    );
    // 理由: prefers-reduced-motion: reduce 時の transition: none が定義されていることを検証するため部分一致を使う
    expect(strippedScoringCss).toContain(
      '@media (prefers-reduced-motion: reduce)'
    );
    // 理由: HEX・ms・cubic-bezier が直書きされていないことを検証するため否定の正規表現一致を使う
    expect(
      strippedScoringCss.match(/:\s*[^;\n]*#([0-9a-fA-F]{3,8})/g)
    ).toBeNull();
    expect(strippedScoringCss.match(/\b\d+ms\b/g)).toBeNull();
    expect(strippedScoringCss.match(/cubic-bezier\([^)]*\)/g)).toBeNull();
  });

  it('Issue142-D1: Dialog が position:fixed かつ z-index:30 のコンテナで md-dialog を包む', () => {
    const html = renderToStaticMarkup(
      <Dialog open={false} headline="テスト">
        本文
      </Dialog>
    );

    const match = html.match(/^<div style="([^"]*)"><md-dialog\b/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toBe('position:fixed;z-index:30');
  });
});
