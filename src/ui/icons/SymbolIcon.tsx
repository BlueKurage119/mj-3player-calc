/**
 * Material Symbols (outlined) 共通アイコン部品
 * 出典: https://github.com/google/material-design-icons
 * パス形式: symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg
 * ライセンス: Apache License 2.0
 */

import type React from 'react';

export interface SymbolIconProps {
  d: string;
  size?: string | undefined;
}

export function SymbolIcon({
  d,
  size = '1.5rem'
}: SymbolIconProps): React.JSX.Element {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} aria-hidden="true">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
