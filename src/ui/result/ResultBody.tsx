import type React from 'react';
import type { Tile as CoreTile } from '../../core/tile';
import type { ResultView } from './classify';
import type { ResultContext } from './hora/HoraDetail';
import './result.css';
import { DiscardBody } from './discard';
import { HoraBody, JustHoraBody, ShantenBody, TempaiBody } from './slots';

export interface ResultTileActions {
  tsumo: (tile: CoreTile) => void;
  discard: (tile: CoreTile) => void;
}

export interface ResultBodyProps {
  view: ResultView;
  context?: ResultContext | undefined;
  tileActions?: ResultTileActions | undefined;
  /** 指定時のみ、対象の結果の見出し行に「計算」ボタンを出す(出すかどうかの判定は呼び出し側) */
  onOpenEngine?: (() => void) | undefined;
}

export function ResultBody({
  view,
  context,
  tileActions,
  onOpenEngine
}: ResultBodyProps): React.JSX.Element | null {
  switch (view.kind) {
    case 'none':
      return null;
    case 'just-hora':
      return <JustHoraBody />;
    case 'hora':
      return (
        <HoraBody
          hora={view.hora}
          context={context}
          onOpenEngine={onOpenEngine}
        />
      );
    case 'tempai':
      return (
        <TempaiBody
          tileAvailabilities={view.tileAvailabilities}
          onTsumo={tileActions?.tsumo}
          onOpenEngine={onOpenEngine}
        />
      );
    case 'shanten':
      return (
        <ShantenBody
          shanten={view.shanten}
          tileAvailabilities={view.tileAvailabilities}
          onTsumo={tileActions?.tsumo}
          onOpenEngine={onOpenEngine}
        />
      );
    case 'discard':
      return (
        <DiscardBody
          discards={view.discards}
          onDiscard={tileActions?.discard}
          onOpenEngine={onOpenEngine}
        />
      );
  }
}
