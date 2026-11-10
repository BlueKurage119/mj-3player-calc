import type React from 'react';
import type { Wind } from '../../core/table';
import { ConnectedButtonGroup } from '../expressive';
import { useAppDispatch, useAppState } from '../state';

export interface WindSegmentContentProps {
  round: Wind;
  seat: Wind;
  onRoundChange: (wind: Wind) => void;
  onSeatChange: (wind: Wind) => void;
}

const WIND_OPTIONS = [
  { value: 'east' as const, label: '東' },
  { value: 'south' as const, label: '南' },
  { value: 'west' as const, label: '西' }
] as const;

export function WindSegmentContent({
  round,
  seat,
  onRoundChange,
  onSeatChange
}: WindSegmentContentProps): React.JSX.Element {
  return (
    <div className="wind-segment">
      <div className="wind-segment__group">
        <span className="wind-segment__label" aria-hidden="true">
          場風
        </span>
        <ConnectedButtonGroup<Wind>
          label="場風"
          options={WIND_OPTIONS}
          value={round}
          onValueChange={onRoundChange}
        />
      </div>
      <div className="wind-segment__group">
        <span className="wind-segment__label" aria-hidden="true">
          自風
        </span>
        <ConnectedButtonGroup<Wind>
          label="自風"
          options={WIND_OPTIONS}
          value={seat}
          onValueChange={onSeatChange}
        />
      </div>
    </div>
  );
}

export function WindSegment(): React.JSX.Element {
  const { table } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <WindSegmentContent
      round={table.round}
      seat={table.seat}
      onRoundChange={wind =>
        dispatch({ type: 'set-wind', field: 'round', wind })
      }
      onSeatChange={wind => dispatch({ type: 'set-wind', field: 'seat', wind })}
    />
  );
}
