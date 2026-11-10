import type React from 'react';
import type { HandOptions } from '../../core/input';
import { ConnectedButtonGroup, type ConnectedOption } from '../expressive';
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

const RIICHI_BASE_OPTIONS: readonly ConnectedOption<RiichiBase>[] = [
  { value: 'none', label: 'なし' },
  { value: 'riichi', label: '立直' },
  { value: 'double-riichi', label: 'ダブル立直' }
] as const;

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
      <div className="situation-riichi-group">
        <ConnectedButtonGroup<RiichiBase>
          label="立直"
          options={RIICHI_BASE_OPTIONS}
          value={base}
          onValueChange={nextBase => {
            onRiichiChange(composeRiichi(nextBase, open));
          }}
          className="situation-riichi"
        />
        {openRiichiAllowed ? (
          <div className="situation-riichi-open-row">
            <FilterChip
              label="オープン"
              selected={open}
              disabled={base === 'none'}
              onSelectedChange={nextOpen => {
                onRiichiChange(composeRiichi(base, nextOpen));
              }}
            />
          </div>
        ) : null}
      </div>

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
