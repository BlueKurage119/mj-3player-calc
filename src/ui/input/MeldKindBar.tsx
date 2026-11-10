import type React from 'react';
import { ConnectedButtonGroup } from '../expressive';
import {
  type AppState,
  type MeldKind,
  canSetMeld,
  kindOfMeld,
  meldOfKind,
  useAppDispatch,
  useAppState
} from '../state';

export interface MeldKindBarProps {
  i: number;
}

export interface MeldKindOption {
  value: MeldKind;
  label: string;
  disabled: boolean;
}

export function getMeldKindOptions(
  state: Pick<AppState, 'input' | 'rule'>,
  i: number
): MeldKindOption[] | null {
  const meld = state.input.melds[i];
  if (!meld) return null;

  const ponDisabled = !canSetMeld(state, i, meldOfKind('pon', meld.tile));
  const minkanDisabled = !canSetMeld(state, i, meldOfKind('minkan', meld.tile));
  const ankanDisabled = !canSetMeld(state, i, meldOfKind('ankan', meld.tile));

  return [
    { value: 'pon', label: 'ポン', disabled: ponDisabled },
    { value: 'minkan', label: '明槓', disabled: minkanDisabled },
    { value: 'ankan', label: '暗槓', disabled: ankanDisabled }
  ];
}

export interface MeldKindBarContentProps {
  kind: MeldKind;
  options: MeldKindOption[];
  onValueChange: (kind: MeldKind) => void;
}

export function MeldKindBarContent({
  kind,
  options,
  onValueChange
}: MeldKindBarContentProps): React.JSX.Element {
  return (
    <ConnectedButtonGroup<MeldKind>
      label="副露の種類"
      className="meld-kind-bar"
      value={kind}
      options={options}
      onValueChange={onValueChange}
    />
  );
}

export function MeldKindBar({ i }: MeldKindBarProps): React.JSX.Element | null {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const meld = state.input.melds[i];

  if (!meld) return null;

  const currentKind = kindOfMeld(meld);
  const options = getMeldKindOptions(state, i);
  if (!options) return null;

  return (
    <MeldKindBarContent
      kind={currentKind}
      options={options}
      onValueChange={kind => dispatch({ type: 'set-meld-kind', i, kind })}
    />
  );
}
