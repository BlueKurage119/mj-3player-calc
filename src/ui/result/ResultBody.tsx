import type React from 'react';
import type { ResultView } from './classify';
import './result.css';
import {
  DiscardBody,
  HoraBody,
  JustHoraBody,
  ShantenBody,
  TempaiBody
} from './slots';

export interface ResultBodyProps {
  view: ResultView;
}

export function ResultBody({
  view
}: ResultBodyProps): React.JSX.Element | null {
  switch (view.kind) {
    case 'none':
      return null;
    case 'just-hora':
      return <JustHoraBody />;
    case 'hora':
      return <HoraBody hora={view.hora} />;
    case 'tempai':
      return <TempaiBody tileAvailabilities={view.tileAvailabilities} />;
    case 'shanten':
      return (
        <ShantenBody
          shanten={view.shanten}
          tileAvailabilities={view.tileAvailabilities}
        />
      );
    case 'discard':
      return <DiscardBody discards={view.discards} />;
  }
}
