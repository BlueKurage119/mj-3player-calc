import type React from 'react';
import type { Rule } from '../../core/rule';
import {
  RULE_ITEMS,
  type RuleItem,
  type SelectRuleKey
} from '../../core/rule-items';
import { Disclosure } from '../expressive';
import { SYMBOL_ARROW_BACK, SymbolIcon } from '../icons';
import { Button, Divider, IconButton } from '../md';
import { TSUMO_LOSS_DESCRIPTIONS } from '../settings/rule-help';
import { useAppDispatch } from '../state';
import '../help/help.css';
import './main-screen.css';

export interface HelpViewProps {
  onBack: () => void;
  onOpenLicense: () => void;
}

function getRuleLabel(key: RuleItem['key']): string {
  return RULE_ITEMS.find(item => item.key === key)?.label ?? '';
}

function getSelectOptionLabel<K extends SelectRuleKey>(
  key: K,
  value: Rule[K]
): string {
  const item = RULE_ITEMS.find(i => i.key === key);
  if (item?.kind !== 'select') return '';
  const options = item.options as readonly { value: Rule[K]; label: string }[];
  return options.find(o => o.value === value)?.label ?? '';
}

/** ヘルプ画面の描画本体(props のみで描画し、テスト可能にする) */
export function HelpView({
  onBack,
  onOpenLicense
}: HelpViewProps): React.JSX.Element {
  const tsumoLossLabel = getRuleLabel('tsumoLoss');
  const tsumoLossLossLabel = getSelectOptionLabel('tsumoLoss', 'loss');
  const tsumoLossNorthSplitLabel = getSelectOptionLabel(
    'tsumoLoss',
    'north-split'
  );
  const tsumoLossRonSplitLabel = getSelectOptionLabel('tsumoLoss', 'ron-split');
  const northLabel = getRuleLabel('north');
  const northNukidoraLabel = getSelectOptionLabel('north', 'nukidora');
  const northYakuhaiLabel = getSelectOptionLabel('north', 'yakuhai');
  const localYakuLabel = getRuleLabel('localYaku');
  const openRiichiLabel = getRuleLabel('openRiichi');
  const roundedManganLabel = getRuleLabel('roundedMangan');
  const accumlatedYakumanLabel = getRuleLabel('accumlatedYakuman');
  const doubleWindFuLabel = getRuleLabel('doubleWindFu');

  return (
    <div className="help-screen">
      <header className="app-header">
        <div className="app-header__inner app-header__inner--start">
          <IconButton
            variant="standard"
            label="戻る"
            className="help-screen__back-button"
            onClick={onBack}
          >
            <SymbolIcon d={SYMBOL_ARROW_BACK} />
          </IconButton>
          <h1 className="app-header__title">ヘルプ</h1>
        </div>
      </header>
      <main className="help-screen__content">
        <div className="help-screen__disclosures">
          <Disclosure summary="結果の見方">
            <div className="help-screen__body">
              <p>
                {
                  '入力中の手牌に応じて、結果の表示が切り替わります。副露した牌も枚数に含めます。'
                }
              </p>
              <ul>
                <li>
                  <strong>和了の形(14枚)</strong>
                  {
                    ': 役・飜・符・点数を、ロンとツモの両方について表示します。手牌の最後の牌を和了牌とします。'
                  }
                </li>
                <li>
                  <strong>聴牌(13枚)</strong>
                  {
                    ': 和了牌ごとに、役と点数をロンとツモの両方について表示します。'
                  }
                </li>
                <li>
                  <strong>聴牌でない13枚</strong>
                  {': 向聴数と、有効牌の種類・残り枚数を表示します。'}
                </li>
                <li>
                  <strong>和了の形でない14枚</strong>
                  {': 何切るとして、切る牌ごとに向聴数と受け入れを表示します。'}
                </li>
                <li>
                  <strong>13枚に満たないとき</strong>
                  {': 途中の形のまま表示します。点数は出ません。'}
                  <ul>
                    <li>
                      {
                        '13枚と同じく1枚待ちの枚数(10・7・4・1枚): 聴牌なら待ち牌を、聴牌でなければ向聴数と有効牌を表示します。'
                      }
                    </li>
                    <li>
                      {
                        '14枚と同じく1枚多い枚数(11・8・5・2枚): 和了の形なら案内を、和了の形でなければ何切るを表示します。'
                      }
                    </li>
                    <li>
                      {'それ以外の枚数(12・9・6・3枚): 何も表示しません。'}
                    </li>
                  </ul>
                </li>
              </ul>
              <p>
                {
                  '待ち牌・有効牌の一覧(和了の点数が出ない聴牌と、向聴)では、牌をタップするとその牌をツモします。何切るでは、各候補の先頭の「打」の牌をタップするとその牌を切ります。'
                }
              </p>
              <p>
                {
                  '役がドラ(赤ドラ・抜きドラ・裏ドラを含む)だけのときは、和了になりません(「役なし」と表示します)。'
                }
              </p>
              <p>
                {
                  '「符 ○・基本点 ○」の行を開くと、符の内訳を確認できます(国士無双・十三不塔では出ません)。'
                }
              </p>
              <p>{`ツモの点数の支払い方は、設定の「${tsumoLossLabel}」に従います。`}</p>
            </div>
          </Disclosure>

          <Disclosure summary="入力のしかた">
            <div className="help-screen__body">
              <p>
                {
                  '手牌・ドラ・裏ドラ・副露のカードをタップすると、画面の下に入力パネルが開きます。入力方式は「パレット」と「テンキー」を切り替えられます。切り替えても、入力中の牌は消えません。'
                }
              </p>
              <ul>
                <li>
                  {
                    '萬子は1と9だけを入力できます。同じ牌は5枚以上入力できません(赤牌を含めて数えます)。'
                  }
                </li>
                <li>
                  {
                    '手牌の牌をタップすると選択され、もう一度タップすると削除されます。'
                  }
                </li>
                <li>
                  {
                    '裏ドラは、立直(ダブル立直・オープン立直を含む)のときだけ数えます。'
                  }
                </li>
                <li>
                  {
                    '場風・自風は、画面上部のボタンで切り替えます。自風が東のときが親です。'
                  }
                </li>
                <li>{'立直・一発などは、「状況役」のカードで指定します。'}</li>
                <li>
                  {`抜き北の枚数は、設定の「${northLabel}」が「${northNukidoraLabel}」のときに指定できます。`}
                </li>
                <li>
                  {
                    'メニューの「ランダム14枚」「ランダム清一色」で、手牌を作り直せます。'
                  }
                </li>
              </ul>

              <h3 className="help-screen__subheading">テンキーの入力</h3>
              <p>
                {
                  '数字を打ってから、萬子・筒子・索子・字牌のキーで確定します(例: 「123」→ 筒子 で 1筒2筒3筒)。字牌の数字は 1=東、2=南、3=西、4=北、5=白、6=發、7=中です。0 は赤5です。'
                }
              </p>

              <h3 className="help-screen__subheading">
                <strong>キーボードの操作</strong>
                <span className="help-screen__subheading-note">
                  (入力パネルが開いているとき)
                </span>
              </h3>
              <div className="help-screen__table-scroll">
                <table className="help-screen__table">
                  <thead>
                    <tr>
                      <th scope="col">キー</th>
                      <th scope="col">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>0〜9</td>
                      <td>数字を入力</td>
                    </tr>
                    <tr>
                      <td>M・P・S・Z</td>
                      <td>萬子・筒子・索子・字牌で確定</td>
                    </tr>
                    <tr>
                      <td>Backspace</td>
                      <td>数字を1文字消す。数字がないときは牌を1枚消す</td>
                    </tr>
                    <tr>
                      <td>Enter</td>
                      <td>入力パネルを閉じる</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>パレットの入力方式でも同じキーが使えます。</p>
            </div>
          </Disclosure>

          <Disclosure summary="三麻のルール上の注意">
            <div className="help-screen__body">
              <p>
                {
                  '三人麻雀では、萬子は 1萬と9萬だけを使います(全108枚)。萬子のドラ表示牌は、1萬ならドラは9萬、9萬ならドラは1萬です。萬子では順子を作れないため、三色同順は成立しません。'
                }
              </p>

              <h3 className="help-screen__subheading">{tsumoLossLabel}</h3>
              <p>
                {`三人麻雀のツモでは、四人麻雀の北家にあたる支払いがありません。その扱いを設定の「${tsumoLossLabel}」で選びます。`}
              </p>
              <ul>
                <li>{`${tsumoLossLossLabel}: ${TSUMO_LOSS_DESCRIPTIONS.loss}`}</li>
                <li>
                  {`${tsumoLossNorthSplitLabel}: ${TSUMO_LOSS_DESCRIPTIONS['north-split']}`}
                </li>
                <li>
                  {`${tsumoLossRonSplitLabel}: ${TSUMO_LOSS_DESCRIPTIONS['ron-split']}`}
                </li>
              </ul>
              <div className="help-screen__table-scroll">
                <table className="help-screen__table help-screen__table--points">
                  <thead>
                    <tr>
                      <th scope="col">満貫ツモ</th>
                      <th scope="col">親</th>
                      <th scope="col">子</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">{tsumoLossLossLabel}</th>
                      <td className="tabular-nums">4000オール(8000点)</td>
                      <td className="tabular-nums">2000・4000(6000点)</td>
                    </tr>
                    <tr>
                      <th scope="row">{tsumoLossNorthSplitLabel}</th>
                      <td className="tabular-nums">6000オール(12000点)</td>
                      <td className="tabular-nums">3000・5000(8000点)</td>
                    </tr>
                    <tr>
                      <th scope="row">{tsumoLossRonSplitLabel}</th>
                      <td className="tabular-nums">6000オール(12000点)</td>
                      <td className="tabular-nums">4000オール(8000点)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="help-screen__subheading">{northLabel}</h3>
              <ul>
                <li>
                  {`${northNukidoraLabel}: 抜いた北1枚につき1飜です。抜いても門前のままです。抜かずに手牌で使う北は客風牌で、役牌になりません。`}
                </li>
                <li>
                  {`${northYakuhaiLabel}: 北の刻子・槓子で1飜役「役牌：北」になります。`}
                </li>
              </ul>

              <h3 className="help-screen__subheading">{localYakuLabel}</h3>
              <p>
                {`設定の「${localYakuLabel}」で、採用しているローカル役を一括でオン・オフします。既定はオフです。${openRiichiLabel}は、設定の「${openRiichiLabel}」で別にオン・オフします。`}
              </p>
            </div>
          </Disclosure>

          <Disclosure summary="点数計算表・共有画像">
            <div className="help-screen__body">
              <h3 className="help-screen__subheading">点数計算表</h3>
              <p>
                {`メニューの「点数計算表」で、符・飜ごとのロンとツモの点数を確認できます。親・子を切り替えられます。表は、設定の「${tsumoLossLabel}」「${roundedManganLabel}」「${accumlatedYakumanLabel}」「${doubleWindFuLabel}」に合わせて変わります。`}
              </p>

              <h3 className="help-screen__subheading">共有画像</h3>
              <p>
                {
                  '和了の結果では、「点差」の行の横に、共有・保存・コピーのボタンが表示されます。和了の内容を画像にして、共有したり、保存したり、クリップボードにコピーしたりできます。端末やブラウザが対応していないボタンは表示されません。役なしのときは表示されません。'
                }
              </p>
            </div>
          </Disclosure>
        </div>

        <Divider />
        <Button
          variant="text"
          className="help-screen__license-link"
          onClick={onOpenLicense}
        >
          ライセンス
        </Button>
        <p className="help-screen__version">{`バージョン ${__APP_VERSION__}`}</p>
      </main>
    </div>
  );
}

/** ヘルプ画面 */
export function HelpScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <HelpView
      onBack={() => dispatch({ type: 'navigate', screen: 'main' })}
      onOpenLicense={() =>
        dispatch({ type: 'navigate', screen: 'license', returnTo: 'help' })
      }
    />
  );
}

export default HelpScreen;
