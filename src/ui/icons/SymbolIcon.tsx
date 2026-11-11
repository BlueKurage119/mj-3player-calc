/**
 * Material Symbols (outlined) 共通アイコン部品
 * 出典: https://github.com/google/material-design-icons (Google の Material Design Icons)
 * パス形式: symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg
 * ライセンス: Apache License 2.0 (https://www.apache.org/licenses/LICENSE-2.0)
 *   全文は LICENSES/Apache-2.0.txt、クレジットは CREDITS.md を参照
 * 描画するパスは symbol-paths.ts に公式 SVG (24px) の path の d を無改変で書き写したもの。viewBox は公式値のまま
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
