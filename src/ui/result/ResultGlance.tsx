import type React from 'react';
import type { ResultView } from './classify';
import './result.css';
import {
  DiscardGlance,
  HoraGlance,
  ShantenGlance,
  TempaiGlance
} from './slots';

export interface ResultGlanceProps {
  view: ResultView;
  /** 13枚形(和了牌が未入力)。和了形のバナーを点数でなく待ちで出す */
  waitInput?: boolean;
}

export function ResultGlance({
  view,
  waitInput = false
}: ResultGlanceProps): React.JSX.Element | null {
  switch (view.kind) {
    case 'none':
      return null;
    case 'just-hora':
      return null;
    case 'hora':
      return <HoraGlance hora={view.hora} waitInput={waitInput} />;
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
