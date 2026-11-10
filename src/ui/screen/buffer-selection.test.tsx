import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultRule } from '../../core/rule';
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

const { HandCard } = await import('./HandCard');
const { IndicatorCard } = await import('./IndicatorCard');
const { MeldArea, MeldAreaContent } = await import('./MeldArea');

const createState = (
  focus: AppState['inputFocus'],
  buffer: string,
  melds: AppState['input']['melds'] = []
): AppState => {
  const base = createInitialState(createDefaultRule());
  return {
    ...base,
    input: {
      ...base.input,
      melds,
      dora: [{ type: 'm', n: 1 }],
      uradora: [{ type: 'p', n: 9 }]
    },
    inputFocus: focus,
    tenkeyBuffer: buffer
  };
};

describe('D4-C28: バッファ表示 (確定事項 37・44)', () => {
  beforeEach(() => {
    holder.state = createState(null, '');
  });

  const renderCards = (s: AppState): string => {
    holder.state = s;
    return renderToStaticMarkup(
      <div>
        <HandCard />
        <IndicatorCard target="dora" />
        <IndicatorCard target="uradora" />
        <MeldArea />
      </div>
    );
  };

  it('D4-C28a: tenkeyBuffer="1" で inputFocus に応じて対象カードにだけバッファが表示される', () => {
    const melds: AppState['input']['melds'] = [
      { type: 'pon', tile: { type: 'p', n: 1 } },
      { type: 'pon', tile: { type: 's', n: 2 } }
    ];

    // hand 選択時: HandCard にのみバッファが表示され、他には表示されない
    const htmlHand = renderCards(createState({ type: 'hand' }, '1', melds));
    const handCardHtml = htmlHand.substring(
      htmlHand.indexOf('class="hand-card'),
      htmlHand.indexOf('class="indicator-card')
    );
    // 理由: 手牌カード内にバッファ表示 (1‸) が存在することを完全一致で検証するため
    expect(handCardHtml.includes('1‸')).toBe(true);
    // 理由: 全体の中でバッファ表示は1つのみであることを検証するため
    expect((htmlHand.match(/1‸/g) ?? []).length).toBe(1);

    // dora 選択時: IndicatorCard(dora) にのみバッファが表示される
    const htmlDora = renderCards(createState({ type: 'dora' }, '1', melds));
    expect(htmlDora.includes('indicator-card__title">ドラ<')).toBe(true);
    expect((htmlDora.match(/1‸/g) ?? []).length).toBe(1);
    const doraCardPart = htmlDora.substring(
      htmlDora.indexOf('indicator-card__title">ドラ<'),
      htmlDora.indexOf('indicator-card__title">裏ドラ<')
    );
    const uradoraCardPart = htmlDora.substring(
      htmlDora.indexOf('indicator-card__title">裏ドラ<'),
      htmlDora.indexOf('class="meld-area')
    );
    expect(doraCardPart.includes('1‸')).toBe(true);
    expect(uradoraCardPart.includes('1‸')).toBe(false);
    // 手牌カードにバッファがないこと
    const handFromDora = htmlDora.substring(
      htmlDora.indexOf('class="hand-card'),
      htmlDora.indexOf('class="indicator-card')
    );
    expect(handFromDora.includes('1‸')).toBe(false);

    // uradora 選択時: IndicatorCard(uradora) にのみバッファが表示される
    const htmlUradora = renderCards(
      createState({ type: 'uradora' }, '1', melds)
    );
    expect((htmlUradora.match(/1‸/g) ?? []).length).toBe(1);
    const doraFromUradora = htmlUradora.substring(
      htmlUradora.indexOf('indicator-card__title">ドラ<'),
      htmlUradora.indexOf('indicator-card__title">裏ドラ<')
    );
    const uradoraFromUradora = htmlUradora.substring(
      htmlUradora.indexOf('indicator-card__title">裏ドラ<'),
      htmlUradora.indexOf('class="meld-area')
    );
    expect(doraFromUradora.includes('1‸')).toBe(false);
    expect(uradoraFromUradora.includes('1‸')).toBe(true);

    // meld 0 選択時: 副露0にのみバッファが表示され、副露1や手牌やドラには表示されない
    const htmlMeld0 = renderCards(
      createState({ type: 'meld', i: 0 }, '1', melds)
    );
    expect((htmlMeld0.match(/1‸/g) ?? []).length).toBe(1);
    const meld0Part = htmlMeld0.substring(
      htmlMeld0.indexOf('aria-label="副露1を入力"'),
      htmlMeld0.indexOf('aria-label="副露2を入力"')
    );
    const meld1Part = htmlMeld0.substring(
      htmlMeld0.indexOf('aria-label="副露2を入力"'),
      htmlMeld0.indexOf('class="meld-add"')
    );
    expect(meld0Part.includes('1‸')).toBe(true);
    expect(meld1Part.includes('1‸')).toBe(false);

    // inputFocus = null のとき: どこにもバッファが表示されない
    const htmlNull = renderCards(createState(null, '1', melds));
    // 理由: inputFocus が null のときはどのカードにもバッファが表示されないことを検証するため
    expect(htmlNull.includes('‸')).toBe(false);
  });

  it('D4-C28b: MeldAreaContent でバッファがあるとき牌列・空枠を描かずバッファだけを描く (確定事項 44)', () => {
    const melds: AppState['input']['melds'] = [
      { type: 'pon', tile: { type: 'p', n: 1 } },
      { type: 'pon', tile: null }
    ];

    // 副露0 (牌入り) が選択中でバッファ '1' があるとき
    const html0 = renderToStaticMarkup(
      <MeldAreaContent
        melds={melds}
        red={1}
        selectedIndex={0}
        buffer="1"
        onSelectMeld={() => {}}
        onRemoveMeld={() => {}}
        onAddMeld={() => {}}
      />
    );

    const meldCards0 = html0.match(
      /<div[^>]*class="[^"]*meld-card[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
    );
    const card0 = meldCards0?.[0] ?? '';
    const card1 = meldCards0?.[1] ?? '';

    // 副露0: バッファが表示され、.meld-card__tiles や .meld-card__empty が描かれないこと
    expect(card0.includes('card-buffer')).toBe(true);
    expect(card0.includes('1‸')).toBe(true);
    // 理由: 確定事項44によりバッファ中は牌列を描かないことを検証するため
    expect(card0.includes('meld-card__tiles')).toBe(false);
    expect(card0.includes('meld-card__empty')).toBe(false);

    // 副露1 (空副露): 非選択なので空枠が描かれ、バッファは描かれないこと
    expect(card1.includes('card-buffer')).toBe(false);
    expect(card1.includes('meld-card__empty')).toBe(true);

    // 副露1 (空副露) が選択中でバッファ '2' があるとき
    const html1 = renderToStaticMarkup(
      <MeldAreaContent
        melds={melds}
        red={1}
        selectedIndex={1}
        buffer="2"
        onSelectMeld={() => {}}
        onRemoveMeld={() => {}}
        onAddMeld={() => {}}
      />
    );

    const meldCards1 = html1.match(
      /<div[^>]*class="[^"]*meld-card[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
    );
    const card1Selected = meldCards1?.[1] ?? '';

    // 副露1: バッファが表示され、.meld-card__empty が描かれないこと
    expect(card1Selected.includes('card-buffer')).toBe(true);
    expect(card1Selected.includes('2‸')).toBe(true);
    // 理由: 確定事項44により空副露でもバッファ中は空枠を描かないことを検証するため
    expect(card1Selected.includes('meld-card__empty')).toBe(false);
  });
});

describe('D4-C29: 選択中の背景修飾クラス (確定事項 38)', () => {
  beforeEach(() => {
    holder.state = createState(null, '');
  });

  const renderCards = (s: AppState): string => {
    holder.state = s;
    return renderToStaticMarkup(
      <div>
        <HandCard />
        <IndicatorCard target="dora" />
        <IndicatorCard target="uradora" />
        <MeldArea />
      </div>
    );
  };

  it('D4-C29a: inputFocus に応じて対象の外枠にだけ --selected クラスが付き、close-sheet で全解除される', () => {
    const melds: AppState['input']['melds'] = [
      { type: 'pon', tile: { type: 'p', n: 1 } },
      { type: 'pon', tile: { type: 's', n: 2 } }
    ];

    // inputFocus = hand
    const htmlHand = renderCards(createState({ type: 'hand' }, '', melds));
    expect(htmlHand.includes('hand-card--selected')).toBe(true);
    expect(htmlHand.includes('indicator-card--selected')).toBe(false);
    expect(htmlHand.includes('meld-card--selected')).toBe(false);

    // inputFocus = dora
    const htmlDora = renderCards(createState({ type: 'dora' }, '', melds));
    expect(htmlDora.includes('hand-card--selected')).toBe(false);
    expect(htmlDora.includes('meld-card--selected')).toBe(false);
    // ドラのカードにだけ付き、裏ドラには付かない
    const indicatorCardsDora = htmlDora.match(
      /<div[^>]*class="[^"]*\bindicator-card\b[^"]*"/g
    );
    expect(indicatorCardsDora?.[0]?.includes('indicator-card--selected')).toBe(
      true
    );
    expect(indicatorCardsDora?.[1]?.includes('indicator-card--selected')).toBe(
      false
    );

    // inputFocus = uradora
    const htmlUradora = renderCards(
      createState({ type: 'uradora' }, '', melds)
    );
    expect(htmlUradora.includes('hand-card--selected')).toBe(false);
    expect(htmlUradora.includes('meld-card--selected')).toBe(false);
    const indicatorCardsUradora = htmlUradora.match(
      /<div[^>]*class="[^"]*\bindicator-card\b[^"]*"/g
    );
    expect(
      indicatorCardsUradora?.[0]?.includes('indicator-card--selected')
    ).toBe(false);
    expect(
      indicatorCardsUradora?.[1]?.includes('indicator-card--selected')
    ).toBe(true);

    // inputFocus = meld 0: 副露が2つのとき、副露0だけに付き副露1には付かない
    const htmlMeld0 = renderCards(
      createState({ type: 'meld', i: 0 }, '', melds)
    );
    expect(htmlMeld0.includes('hand-card--selected')).toBe(false);
    expect(htmlMeld0.includes('indicator-card--selected')).toBe(false);
    const meldCards0 = htmlMeld0.match(
      /<div[^>]*class="[^"]*\bmeld-card\b[^"]*"/g
    );
    expect(meldCards0?.[0]?.includes('meld-card--selected')).toBe(true);
    expect(meldCards0?.[1]?.includes('meld-card--selected')).toBe(false);

    // inputFocus = meld 1: 副露1だけに付く
    const htmlMeld1 = renderCards(
      createState({ type: 'meld', i: 1 }, '', melds)
    );
    const meldCards1 = htmlMeld1.match(
      /<div[^>]*class="[^"]*\bmeld-card\b[^"]*"/g
    );
    expect(meldCards1?.[0]?.includes('meld-card--selected')).toBe(false);
    expect(meldCards1?.[1]?.includes('meld-card--selected')).toBe(true);

    // inputFocus = null (close-sheet): 全カードから外れる
    const htmlNull = renderCards(createState(null, '', melds));
    expect(htmlNull.includes('hand-card--selected')).toBe(false);
    expect(htmlNull.includes('indicator-card--selected')).toBe(false);
    expect(htmlNull.includes('meld-card--selected')).toBe(false);
  });
});
