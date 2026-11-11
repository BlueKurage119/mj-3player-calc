import type React from 'react';
import type { ResultView } from './classify';
import './result.css';
import {
  DiscardGlance,
  HoraGlance,
  JustHoraGlance,
  ShantenGlance,
  TempaiGlance
} from './slots';

export interface ResultGlanceProps {
  view: ResultView;
}

export function ResultGlance({
  view
}: ResultGlanceProps): React.JSX.Element | null {
  switch (view.kind) {
    case 'none':
      return null;
    case 'just-hora':
      return <JustHoraGlance />;
    case 'hora':
      return <HoraGlance hora={view.hora} />;
    case 'tempai':
      return <TempaiGlance tileAvailabilities={view.tileAvailabilities} />;
    case 'shanten':
      return (
        <ShantenGlance
          shanten={view.shanten}
          tileAvailabilities={view.tileAvailabilities}
        />
      );
    case 'discard':
      return <DiscardGlance discards={view.discards} />;
  }
}
