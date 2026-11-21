import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { HandOptions } from '../../core/input';
import { type ShisanputaNotice, shisanputaNotice } from '../../core/local-yaku';
import { generateResult } from '../../core/result';
import { DEFAULT_RULE, type Rule } from '../../core/rule';
import type { Table } from '../../core/table';
import type { Tile } from '../../core/tile';
import { computeResult, computeShisanputaNotice } from '../calc/compute';
import { evaluateResult } from '../calc/result-state';
import { ResultPanel } from '../screen/ResultPanel';
import { ResultGlance } from './ResultGlance';
import { classifyResult } from './classify';

const eastTable: Table = {
  round: 'east',
  seat: 'east',
  continue: 0,
  deposit: 0
};

const southTable: Table = {
  round: 'east',
  seat: 'south',
  continue: 0,
  deposit: 0
};

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

const localRule: Rule = {
  ...DEFAULT_RULE,
  localYaku: true
};

const parseTiles = (s: string): Tile[] => {
  const tiles: Tile[] = [];
  let digits: string[] = [];
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') {
      digits.push(ch);
      continue;
    }
    if (ch !== 'm' && ch !== 'p' && ch !== 's' && ch !== 'z') {
      throw new Error(`不正な牌種: ${ch}`);
    }
    for (const d of digits) {
      const n = Number(d);
      if (ch === 'z') {
        tiles.push({ type: 'z', n } as Tile);
      } else if (n === 0) {
        tiles.push({ type: ch, n: 5, red: true });
      } else if (n === 5) {
        tiles.push({ type: ch, n: 5, red: false });
      } else {
        tiles.push({ type: ch, n } as Tile);
      }
    }
    digits = [];
  }
  return tiles;
};

const c01Hand = parseTiles('19m147p147s12345z');
const c10Hand = parseTiles('19m147p147s123455z');

const makeInput = (hand: Tile[]) => ({
  hand,
  melds: [],
  dora: [],
  uradora: [],
  nuki: 0
});

const chance = (hand: Tile[], dora: Tile[] = []): ShisanputaNotice =>
  shisanputaNotice(
    eastTable,
    { ...makeInput(hand), dora },
    defaultOptions,
    localRule
  );

const stripPreload = (html: string): string =>
  html.replace(/^(?:<link [^>]*\/>)+/, '');

describe('I85: 十三不搭メッセージ UI・統合検査 (U-01〜U-08)', () => {
  it('I85-U-01: chance かつ shanten のとき、section より前に button/ripple/focus-ring なしの div で「十三不搭チャンス」を出す', () => {
    const res = generateResult(
      eastTable,
      makeInput(c01Hand),
      defaultOptions,
      localRule
    );
    expect(classifyResult(res).kind).toBe('shanten');

    const body = stripPreload(
      renderToStaticMarkup(
        <ResultPanel
          resultState={{
            status: 'ok',
            result: res,
            shisanputa: chance(c01Hand)
          }}
        />
      )
    );

    const sectionIdx = body.indexOf('<section id="result-panel"');
    expect(sectionIdx).toBeGreaterThan(0);
    const notice = body.slice(0, sectionIdx);
    expect(
      notice.startsWith('<div class="shisanputa-notice result-body"')
    ).toBe(true);
    expect(notice).toContain('十三不搭チャンス');
    expect(notice).not.toContain('<button');
    expect(notice).not.toContain('md-ripple');
    expect(notice).not.toContain('md-focus-ring');
  });

  it('I85-U-01b: チャンスカードは見出し・「M種 N枚」・牌と「×残り枚数」を向聴の待ちカード様式で出し、タップ不可', () => {
    const res = generateResult(
      eastTable,
      makeInput(c01Hand),
      defaultOptions,
      localRule
    );
    const render = (notice: ShisanputaNotice) => {
      const body = stripPreload(
        renderToStaticMarkup(
          <ResultPanel
            resultState={{ status: 'ok', result: res, shisanputa: notice }}
          />
        )
      );
      return body.slice(0, body.indexOf('<section id="result-panel"'));
    };
    const notice = render(chance(c01Hand));
    const n = chance(c01Hand);
    if (n?.kind !== 'chance') throw new Error('chance ではない');
    const kinds = n.tileAvailabilities.length;
    const total = n.tileAvailabilities.reduce((a, x) => a + x.count, 0);
    expect(notice).toContain(
      '<h2 class="result-body__title">十三不搭チャンス</h2>'
    );
    expect(notice).toContain('result-body__summary');
    expect(notice).toContain(`${kinds}種 ${total}枚`);
    expect(notice.match(/class="result-body__wait"/g)?.length).toBe(kinds);
    expect(notice.match(/×\d/g)?.length).toBe(kinds);
    expect(notice).not.toContain('<button');
    expect(notice).not.toContain('ツモ');

    // 残り0枚の牌は出さない(C-23 相当: 赤5pがドラ表示牌)
    const hand = parseTiles('1m9m1p9p1s4s7s1z2z3z4z4z5z');
    const withRedDora = chance(hand, parseTiles('0p'));
    if (withRedDora?.kind !== 'chance') throw new Error('chance ではない');
    expect(withRedDora.tileAvailabilities.some(a => a.count === 0)).toBe(true);
    expect(render(withRedDora)).not.toContain('×0');
  });

  it('I85-U-02: shisanputa が chance でも view が discard のときは通知を出さない', () => {
    const res = generateResult(
      eastTable,
      makeInput(c10Hand),
      defaultOptions,
      localRule
    );
    expect(classifyResult(res).kind).toBe('discard');

    const html = renderToStaticMarkup(
      <ResultPanel
        resultState={{ status: 'ok', result: res, shisanputa: chance(c01Hand) }}
      />
    );
    const baseline = renderToStaticMarkup(
      <ResultPanel resultState={{ status: 'ok', result: res }} />
    );
    expect(html).toBe(baseline);
  });

  it('I85-U-03: formed かつ discard のとき、section より前に md-ripple/md-focus-ring/シェブロン付きの button で「十三不搭の形です」を出す', () => {
    const res = generateResult(
      eastTable,
      makeInput(c10Hand),
      defaultOptions,
      localRule
    );
    expect(classifyResult(res).kind).toBe('discard');

    const body = stripPreload(
      renderToStaticMarkup(
        <ResultPanel
          resultState={{
            status: 'ok',
            result: res,
            shisanputa: { kind: 'formed' }
          }}
        />
      )
    );

    const sectionIdx = body.indexOf('<section id="result-panel"');
    expect(sectionIdx).toBeGreaterThan(0);
    expect(body.slice(0, sectionIdx)).toBe(
      '<button type="button" class="shisanputa-notice shisanputa-notice--formed"><md-ripple></md-ripple><md-focus-ring></md-focus-ring><span>十三不搭の形です</span><span class="shisanputa-notice__chevron" aria-hidden="true"><svg viewBox="0 -960 960 960" width="1.5rem" height="1.5rem" aria-hidden="true"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" fill="currentColor"></path></svg></span></button>'
    );
  });

  it('I85-U-04: shisanputa が formed でも view が shanten のときは通知を出さない', () => {
    const res = generateResult(
      eastTable,
      makeInput(c01Hand),
      defaultOptions,
      localRule
    );
    expect(classifyResult(res).kind).toBe('shanten');

    const html = renderToStaticMarkup(
      <ResultPanel
        resultState={{
          status: 'ok',
          result: res,
          shisanputa: { kind: 'formed' }
        }}
      />
    );
    const baseline = renderToStaticMarkup(
      <ResultPanel resultState={{ status: 'ok', result: res }} />
    );
    expect(html).toBe(baseline);
  });

  it('I85-U-05: shisanputa なしのときは通知が出ず、<section id="result-panel" から始まる', () => {
    const res = generateResult(
      eastTable,
      makeInput(c01Hand),
      defaultOptions,
      localRule
    );
    const html = renderToStaticMarkup(
      <ResultPanel resultState={{ status: 'ok', result: res }} />
    );
    const body = stripPreload(html);

    expect(body.startsWith('<section id="result-panel"')).toBe(true);
    // 理由: 通知カード専用のクラスや文言が一切挿入されていないことを全体から確認するため
    expect(html).not.toContain('shisanputa-notice');
    // 理由: <section id="result-panel" に従来の主要属性が保持されていることを確認するため
    expect(body).toContain('aria-label="計算結果"');
    // 理由: <section id="result-panel" の data-state 属性が従来どおり ok であることを確認するため
    expect(body).toContain('data-state="ok"');
  });

  it('I85-U-06: ResultGlance は C-01・C-10 の結果で「十三不搭」を含まない', () => {
    for (const hand of [c01Hand, c10Hand]) {
      const res = generateResult(
        eastTable,
        makeInput(hand),
        defaultOptions,
        localRule
      );
      const html = renderToStaticMarkup(
        <ResultGlance
          view={classifyResult(res)}
          waitInput={hand.length === 13}
        />
      );
      // 理由: 要約バナー用の ResultGlance 全体に「十三不搭」の文言が含まれないことを検証するため
      expect(html).not.toContain('十三不搭');
    }
  });

  it('I85-U-07: evaluateResult に通知関数を渡すと shisanputa が付き、渡さないとキーが付かない', () => {
    const state = {
      table: eastTable,
      input: makeInput(c10Hand),
      handOptions: defaultOptions,
      rule: localRule
    };
    const expectedResult = computeResult(state);

    const withNotice = evaluateResult(
      computeResult,
      null,
      state,
      computeShisanputaNotice
    );
    expect(withNotice).toEqual({
      status: 'ok',
      result: expectedResult,
      shisanputa: { kind: 'formed' }
    });

    const withoutNotice = evaluateResult(computeResult, null, state);
    expect(withoutNotice).toEqual({
      status: 'ok',
      result: expectedResult
    });
    expect('shisanputa' in withoutNotice).toBe(false);
  });

  it('I85-U-08: C-10 に tenho=true を渡すと親子とも hora になり、役は shisanputa(役満1)のみ', () => {
    for (const table of [eastTable, southTable]) {
      const res = generateResult(
        table,
        makeInput(c10Hand),
        { ...defaultOptions, tenho: true },
        localRule
      );
      expect(res?.type).toBe('hora-shanten');
      if (res?.type !== 'hora-shanten' || res.info.type !== 'hora') {
        throw new Error('hora ではない');
      }
      expect(res.info.hora.length).toBe(1);
      expect(res.info.hora[0]?.yaku).toEqual([
        { type: 'yakuman', name: 'shisanputa', point: 1 }
      ]);
    }
  });
});
