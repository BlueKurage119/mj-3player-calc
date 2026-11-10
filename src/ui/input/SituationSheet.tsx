import type React from 'react';
import type { HandOptions } from '../../core/input';
import { ChipSet, FilterChip } from '../md';
import {
  type RiichiBase,
  type SituationChipItem,
  type SituationToggleKey,
  composeRiichi,
  situationSheetModel,
  splitRiichi,
  useAppDispatch,
  useAppState
} from '../state';
import './situation-sheet.css';

export interface SituationSheetContentProps {
  riichi: HandOptions['riichi'];
  openRiichiAllowed: boolean;
  chips: readonly SituationChipItem[];
  onRiichiChange: (riichi: HandOptions['riichi']) => void;
  onChipChange: (key: SituationToggleKey, value: boolean) => void;
}

const RIICHI_BASE_OPTIONS: readonly { value: RiichiBase; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'riichi', label: '立直' },
  { value: 'double-riichi', label: 'ダブル立直' }
];

export function SituationSheetContent({
  riichi,
  openRiichiAllowed,
  chips,
  onRiichiChange,
  onChipChange
}: SituationSheetContentProps): React.JSX.Element {
  const { base, open } = splitRiichi(riichi);

  return (
    <div className="situation-sheet">
      <ChipSet className="situation-chips situation-riichi">
        {RIICHI_BASE_OPTIONS.map(option => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={base === option.value}
            radio
            onSelectedChange={() => {
              onRiichiChange(composeRiichi(option.value, open));
            }}
          />
        ))}
        {openRiichiAllowed ? (
          <FilterChip
            label="オープン"
            selected={open}
            disabled={base === 'none'}
            onSelectedChange={nextOpen => {
              onRiichiChange(composeRiichi(base, nextOpen));
            }}
          />
        ) : null}
      </ChipSet>

      <ChipSet className="situation-chips">
        {chips.map(item => (
          <FilterChip
            key={item.key}
            label={item.label}
            selected={item.selected}
            disabled={item.disabled}
            onSelectedChange={val => onChipChange(item.key, val)}
          />
        ))}
      </ChipSet>
    </div>
  );
}

export function SituationSheet(): React.JSX.Element {
  const { handOptions, table, rule } = useAppState();
  const dispatch = useAppDispatch();

  const chips = situationSheetModel(handOptions, table, rule);

  return (
    <SituationSheetContent
      riichi={handOptions.riichi}
      openRiichiAllowed={rule.openRiichi}
      chips={chips}
      onRiichiChange={riichi => dispatch({ type: 'set-riichi', riichi })}
      onChipChange={(key, value) =>
        dispatch({ type: 'set-situation', key, value })
      }
    />
  );
}
