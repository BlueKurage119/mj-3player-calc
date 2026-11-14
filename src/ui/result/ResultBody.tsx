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
}

export function ResultBody({
  view,
  context,
  tileActions
}: ResultBodyProps): React.JSX.Element | null {
  switch (view.kind) {
    case 'none':
      return null;
    case 'just-hora':
      return <JustHoraBody />;
    case 'hora':
      return <HoraBody hora={view.hora} context={context} />;
    case 'tempai':
      return (
        <TempaiBody
          tileAvailabilities={view.tileAvailabilities}
          onTsumo={tileActions?.tsumo}
        />
      );
    case 'shanten':
      return (
        <ShantenBody
          shanten={view.shanten}
          tileAvailabilities={view.tileAvailabilities}
          onTsumo={tileActions?.tsumo}
        />
      );
    case 'discard':
      return (
        <DiscardBody
          discards={view.discards}
          onDiscard={tileActions?.discard}
        />
      );
  }
}
