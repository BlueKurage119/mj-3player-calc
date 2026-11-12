// 出典: livewing/mahjong-calc (src/components/HoraItem.tsx) および mj-mighty-calc (src/ui/ResultPanel.tsx) を参考に作成
import type React from 'react';
import type { ScoredHora } from '../../../core/result';
import { Divider } from '../../md';
import { Tile } from '../../tile';
import { formatPoints, isNoYaku } from '../hora-summary';
import { FuBreakdown } from './FuBreakdown';
import type { ResultContext } from './HoraDetail';
import {
  formatBasePointText,
  limitName,
  nextTierText,
  payDetailLines,
  yakuHanText,
  yakuLabel
} from './format';
import { nextTier } from './next-tier';

export interface HoraItemProps {
  hora: ScoredHora;
  context?: ResultContext | undefined;
}

export function HoraItem({ hora, context }: HoraItemProps): React.JSX.Element {
  const noYaku = isNoYaku(hora);
  const byLabel = hora.by === 'ron' ? 'ロン' : 'ツモ';

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
      </article>
    );
  }

  const { score } = hora;
  const limit = limitName(score);
  const tier = nextTier(score, context?.rule);
  const payLines = payDetailLines(score.payment);
  const showFuBreakdown =
    score.yakumanPoint === 0 &&
    (hora.type === 'mentsu' || hora.type === 'chitoitsu');

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
                {score.han}飜{score.fu !== null ? ` ${score.fu}符` : ''}
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

      {/* 2.6.3 符の内訳 */}
      {showFuBreakdown ? (
        <FuBreakdown
          fu={hora.type === 'mentsu' ? hora.fu : undefined}
          score={score}
          horaType={hora.type}
          table={context?.table}
        />
      ) : null}

      {/* 2.6.4 基本点 */}
      <div className="hora-item__base-point">
        {formatBasePointText(score.basePoint)}
      </div>
    </article>
  );
}
