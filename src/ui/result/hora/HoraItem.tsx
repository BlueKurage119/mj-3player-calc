// 出典: livewing/mahjong-calc (src/components/HoraItem.tsx) および mj-mighty-calc (src/ui/ResultPanel.tsx) を参考に作成
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import { Divider } from '../../md';
import { Tile } from '../../tile';
import { formatPoints, isNoYaku } from '../hora-summary';
import { FuBreakdown } from './FuBreakdown';
import { PointDiff } from './PointDiff';
import type { ResultContext } from './HoraDetail';
import {
  formatBasePointText,
  limitName,
  nextTierText,
  payDetailLines,
  yakuHanText,
  yakuLabel
} from './format';
import { sumRawFu } from './fu-rows';
import { nextTier } from './next-tier';

export interface HoraItemProps {
  hora: ScoredHora;
  context?: ResultContext | undefined;
}

export function HoraItem({ hora, context }: HoraItemProps): React.JSX.Element {
  const { score } = hora;
  const noYaku = isNoYaku(hora);
  const byLabel = hora.by === 'ron' ? 'ロン' : 'ツモ';
  // 符の概念がない国士無双・十三不塔以外は、役満でも符を出す(UI 監修)
  const showFuBreakdown = hora.type === 'mentsu' || hora.type === 'chitoitsu';
  const displayFu: number | null =
    score.fu ??
    (hora.type === 'chitoitsu'
      ? 25
      : hora.type === 'mentsu'
        ? Math.ceil(sumRawFu(hora.fu) / 10) * 10
        : null);

  if (noYaku) {
    return (
      <article className="hora-item" data-hora-by={hora.by} data-no-yaku="">
        <div className="hora-item__head">
          <span className="hora-item__interp">
            <span className="hora-item__badge">{byLabel}</span>
            <span className="hora-item__tile">
              <Tile tile={hora.horaTile} />
            </span>
          </span>
          <span className="hora-item__no-yaku-text">役なし</span>
        </div>
        {/* 役なしでは、符の明細だけを出す(基本点・点差は出さない。UI 監修) */}
        {showFuBreakdown ? (
          <>
            <Divider />
            <FuBreakdown
              fu={hora.type === 'mentsu' ? hora.fu : undefined}
              score={hora.score}
              displayFu={displayFu ?? 0}
              horaType={hora.type}
              table={context?.table}
              horaTile={hora.horaTile}
              omitBasePoint
            />
          </>
        ) : null}
      </article>
    );
  }

  const limit = limitName(score);
  const tier = nextTier(score, context?.rule);
  const payLines = payDetailLines(score.payment);
  return (
    <article className="hora-item" data-hora-by={hora.by}>
      {/* 2.6.1 見出し行 */}
      <div className="hora-item__head">
        <span className="hora-item__interp">
          <span className="hora-item__badge">{byLabel}</span>
          <span className="hora-item__tile">
            <Tile tile={hora.horaTile} />
          </span>
        </span>
        <span className="hora-item__points tabular-nums">
          {formatPoints(score.payment)}
        </span>
      </div>

      {/* 2行目: 左に飜符・限度名・次の段階、右に支払い内訳 */}
      <div className="hora-item__sub">
        <div className="hora-item__sub-main">
          <div className="hora-item__sub-rank">
            {score.yakumanPoint === 0 ? (
              <span>
                {displayFu !== null ? `${displayFu}符 ` : ''}
                {score.han}飜
              </span>
            ) : null}
            {limit ? (
              <span className="hora-item__limit-name">{limit}</span>
            ) : null}
          </div>
          {tier ? (
            <div className="hora-item__tier-hint">{nextTierText(tier)}</div>
          ) : null}
        </div>
        {payLines.length > 0 ? (
          <div className="hora-item__pay-detail">
            {payLines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : null}
      </div>

      <Divider />

      {/* 2.6.2 役一覧 */}
      <ul className="hora-item__yaku-list">
        {hora.yaku.map((y, i) => (
          <li key={`${y.name}-${i}`} className="hora-item__yaku-row">
            <span>{yakuLabel(y.name)}</span>
            <span className="hora-item__yaku-han tabular-nums">
              {yakuHanText(y)}
            </span>
          </li>
        ))}
      </ul>

      {/* 2.6.3 符の内訳(役一覧との間に仕切り線。UI 監修) */}
      {showFuBreakdown ? <Divider /> : null}
      {showFuBreakdown ? (
        <FuBreakdown
          fu={hora.type === 'mentsu' ? hora.fu : undefined}
          score={score}
          displayFu={displayFu ?? 0}
          horaType={hora.type}
          table={context?.table}
          horaTile={hora.horaTile}
        />
      ) : null}

      {/* 2.6.4 基本点。符の折りたたみがあるときは、その見出しに出す(UI 監修) */}
      {showFuBreakdown ? null : (
        <div className="hora-item__base-point">
          {formatBasePointText(score.basePoint)}
        </div>
      )}

      {/* 符・基本点のブロックの下の仕切り線(このあとに点数差の項目を足す。UI 監修) */}
      <Divider />

      {/* 点差(折りたたみ。UI 監修) */}
      <PointDiff payment={score.payment} />
    </article>
  );
}
