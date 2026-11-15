import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HandOptions } from '../../../core/input';
import { generateResult } from '../../../core/result';
import { DEFAULT_RULE } from '../../../core/rule';
import type { Table } from '../../../core/table';
import type { Tile } from '../../../core/tile';
import HoraDetail, { type ResultContext, type ShareInput } from './HoraDetail';
import { PointDiff } from './PointDiff';
import {
  type PreparedShare,
  ShareControls,
  createShareHandlers
} from './ShareControls';

const defaultOptions: HandOptions = {
  riichi: 'none',
  ippatsu: false,
  rinshan: false,
  chankan: false,
  haitei: false,
  tenho: false,
  tsubameGaeshi: false,
  kanFuri: false
};

const southTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

const winningHand: Tile[] = [
  { type: 'p', n: 2 },
  { type: 'p', n: 3 },
  { type: 'p', n: 4 },
  { type: 'p', n: 5, red: false },
  { type: 'p', n: 6 },
  { type: 'p', n: 7 },
  { type: 's', n: 3 },
  { type: 's', n: 4 },
  { type: 's', n: 6 },
  { type: 's', n: 7 },
  { type: 's', n: 8 },
  { type: 'p', n: 9 },
  { type: 'p', n: 9 },
  { type: 's', n: 2 }
];

const noYakuHand: Tile[] = [
  { type: 'p', n: 1 },
  { type: 'p', n: 2 },
  { type: 'p', n: 3 },
  { type: 'p', n: 4 },
  { type: 'p', n: 5, red: false },
  { type: 'p', n: 6 },
  { type: 's', n: 2 },
  { type: 's', n: 3 },
  { type: 's', n: 4 },
  { type: 's', n: 7 },
  { type: 's', n: 8 },
  { type: 's', n: 9 },
  { type: 'z', n: 1 },
  { type: 'z', n: 1 }
];

function getFirstRonHora(hand: Tile[]) {
  const res = generateResult(
    southTable,
    { hand, melds: [], dora: [], nuki: 0 },
    defaultOptions,
    DEFAULT_RULE
  );
  if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') {
    throw new Error('和了結果が得られませんでした');
  }
  const ron = res.info.hora.find(h => h.by === 'ron');
  if (!ron) {
    throw new Error('ロン結果が得られませんでした');
  }
  return ron;
}

function makeShareInput(hand: Tile[]): ShareInput {
  return {
    hand,
    melds: [],
    dora: [],
    uradora: [],
    nuki: 0,
    riichi: 'none',
    red: DEFAULT_RULE.red,
    nukiEnabled: true
  };
}

describe('ShareControls / PointDiff 連携 (H2-AC6, H2-AC14)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('H2-AC6: 役なしカードには共有・保存・コピーのボタンが無い', () => {
    const noYakuRon = getFirstRonHora(noYakuHand);
    const context: ResultContext = {
      table: southTable,
      rule: DEFAULT_RULE,
      share: makeShareInput(noYakuHand)
    };
    const html = renderToStaticMarkup(
      <HoraDetail hora={[noYakuRon]} context={context} />
    );

    // 意図的アサーション: 役なしカードに出力されない文言・クラスを確認
    expect(html).not.toContain('share-controls');
    expect(html).not.toContain('画像を共有');
    expect(html).not.toContain('画像を保存');
    expect(html).not.toContain('画像をコピー');
  });

  it('H2-AC14: context.share 未指定なら共有ボタン類が出ない', () => {
    const ron = getFirstRonHora(winningHand);
    const html = renderToStaticMarkup(
      <PointDiff
        payment={ron.score.payment}
        hora={ron}
        context={{ table: southTable, rule: DEFAULT_RULE }}
      />
    );

    // 意図的アサーション: 共有ボタン領域自体が含まれないこと、点差トグルは維持されることを検証
    expect(html).not.toContain('share-controls');
    expect(html).toContain('点差');
  });

  it('H2-AC14: detectShareSupport の結果に応じて非対応ボタンを出さず、対応ボタンを共有→保存→コピーの順に並べる', () => {
    const ron = getFirstRonHora(winningHand);
    const context = {
      table: southTable,
      rule: DEFAULT_RULE,
      share: makeShareInput(winningHand)
    };

    // どちらも非対応 -> 保存のみ
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('ClipboardItem', undefined);
    const saveOnlyHtml = renderToStaticMarkup(
      <ShareControls hora={ron} context={context} />
    );
    const saveOnlyLabels = Array.from(
      saveOnlyHtml.matchAll(/aria-label="([^"]+)"/g)
    ).map(m => m[1]);
    expect(saveOnlyLabels).toEqual(['画像を保存']);

    // 共有のみ対応
    vi.stubGlobal('navigator', { canShare: () => true });
    vi.stubGlobal('ClipboardItem', undefined);
    const shareSaveHtml = renderToStaticMarkup(
      <ShareControls hora={ron} context={context} />
    );
    const shareSaveLabels = Array.from(
      shareSaveHtml.matchAll(/aria-label="([^"]+)"/g)
    ).map(m => m[1]);
    expect(shareSaveLabels).toEqual(['画像を共有', '画像を保存']);

    // すべて対応 -> 共有 → 保存 → コピー
    vi.stubGlobal('navigator', {
      canShare: () => true,
      clipboard: { write: vi.fn() }
    });
    vi.stubGlobal('ClipboardItem', class {});
    const allHtml = renderToStaticMarkup(
      <ShareControls hora={ron} context={context} />
    );
    const allLabels = Array.from(allHtml.matchAll(/aria-label="([^"]+)"/g)).map(
      m => m[1]
    );
    expect(allLabels).toEqual(['画像を共有', '画像を保存', '画像をコピー']);
  });

  it('H2-AC14: コピー押下で await 前に ClipboardItem と clipboard.write が同期に呼ばれる', async () => {
    const ron = getFirstRonHora(winningHand);
    const context = {
      table: southTable,
      rule: DEFAULT_RULE,
      share: makeShareInput(winningHand)
    };

    const callEvents: string[] = [];
    const shareMod = await import('../../share');
    type LoadedShareModule = Awaited<
      ReturnType<typeof shareMod.loadShareModule>
    >;
    let resolveShareModule: ((m: LoadedShareModule) => void) | undefined;
    vi.spyOn(shareMod, 'loadShareModule').mockImplementation(
      () =>
        new Promise<LoadedShareModule>(resolve => {
          callEvents.push('loadShareModule');
          resolveShareModule = resolve;
        })
    );

    class MockClipboardItem {
      data: Record<string, Blob | PromiseLike<Blob>>;
      constructor(data: Record<string, Blob | PromiseLike<Blob>>) {
        callEvents.push('ClipboardItem');
        this.data = data;
      }
    }
    const writeSpy = vi.fn(async () => {
      callEvents.push('clipboard.write');
    });

    vi.stubGlobal('ClipboardItem', MockClipboardItem);
    vi.stubGlobal('navigator', { clipboard: { write: writeSpy } });

    const setBusy = vi.fn();
    const clearStatus = vi.fn();
    const showStatus = vi.fn();
    const preparedRef = { current: null as PreparedShare | null };

    const { handleCopy } = createShareHandlers({
      hora: ron,
      context,
      preparedRef,
      setBusy,
      clearStatus,
      showStatus
    });

    const copyPromise = handleCopy();
    // await が解決する前(同期区間内)に ClipboardItem と clipboard.write が呼ばれている
    expect(callEvents).toEqual([
      'loadShareModule',
      'ClipboardItem',
      'clipboard.write'
    ]);
    expect(writeSpy).toHaveBeenCalledTimes(1);

    resolveShareModule?.({
      createShareImage: vi.fn(async () => new File(['x'], 'a.png')),
      shareFile: vi.fn(),
      saveFile: vi.fn(),
      buildShareText: () => ''
    });
    await copyPromise;

    expect(showStatus).toHaveBeenCalledWith('コピーしました', 4000);
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it('H2-AC14: 共有の NotAllowedError 後の再押下で await 前に navigator.share が同期に呼ばれる', async () => {
    const ron = getFirstRonHora(winningHand);
    const context = {
      table: southTable,
      rule: DEFAULT_RULE,
      share: makeShareInput(winningHand)
    };

    const fakeFile = new File(['png'], 'mj3calc-ron-20261115-000000.png', {
      type: 'image/png'
    });
    const shareCalls: string[] = [];
    let shouldFailNotAllowed = true;
    const shareSpy = vi.fn(async () => {
      shareCalls.push('navigator.share');
      if (shouldFailNotAllowed) {
        const err = new Error('NotAllowed');
        err.name = 'NotAllowedError';
        throw err;
      }
    });

    vi.stubGlobal('navigator', { share: shareSpy });

    const shareMod = await import('../../share');
    vi.spyOn(shareMod, 'loadShareModule').mockResolvedValue({
      createShareImage: vi.fn(async () => fakeFile),
      shareFile: async (file, text) => {
        await navigator.share({ files: [file], text: text ?? '' });
      },
      saveFile: vi.fn(),
      buildShareText: () =>
        '三麻点数計算機\nhttps://bluekurage119.github.io/mj-3player-calc/'
    });

    const setBusy = vi.fn();
    const clearStatus = vi.fn();
    const showStatus = vi.fn();
    const preparedRef = { current: null as PreparedShare | null };

    const { handleShare } = createShareHandlers({
      hora: ron,
      context,
      preparedRef,
      setBusy,
      clearStatus,
      showStatus
    });

    // 1回目: NotAllowedError -> 保持して再押下を促す
    await handleShare();
    expect(preparedRef.current?.file).toBe(fakeFile);
    expect(showStatus).toHaveBeenCalledWith(
      '準備ができました。もう一度押してください'
    );

    // 2回目: 同期区間内で即座に navigator.share が呼ばれ、保持済みファイルは消費される
    shouldFailNotAllowed = false;
    shareCalls.length = 0;
    const secondPromise = handleShare();
    expect(shareCalls).toEqual(['navigator.share']);
    expect(preparedRef.current).toBeNull();
    await secondPromise;
  });

  it('H2-AC14: 共有の AbortError は無視し、保存押下では saveFile が呼ばれる', async () => {
    const ron = getFirstRonHora(winningHand);
    const context = {
      table: southTable,
      rule: DEFAULT_RULE,
      share: makeShareInput(winningHand)
    };

    const fakeFile = new File(['png'], 'mj3calc-ron-20261115-000000.png', {
      type: 'image/png'
    });
    const saveFileSpy = vi.fn();
    const shareMod = await import('../../share');
    vi.spyOn(shareMod, 'loadShareModule').mockResolvedValue({
      createShareImage: vi.fn(async () => fakeFile),
      shareFile: async () => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        throw err;
      },
      saveFile: saveFileSpy,
      buildShareText: () => '三麻点数計算機'
    });

    const setBusy = vi.fn();
    const clearStatus = vi.fn();
    const showStatus = vi.fn();
    const preparedRef = { current: null as PreparedShare | null };

    const { handleShare, handleSave } = createShareHandlers({
      hora: ron,
      context,
      preparedRef,
      setBusy,
      clearStatus,
      showStatus
    });

    await handleShare();
    expect(showStatus).not.toHaveBeenCalled();

    await handleSave();
    expect(saveFileSpy).toHaveBeenCalledWith(fakeFile);
    expect(showStatus).not.toHaveBeenCalled();
  });
});
