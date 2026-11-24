import type React from 'react';
import { SYMBOL_ANALYTICS, SymbolIcon } from '../icons';
import { Button } from '../md';

export interface EngineButtonProps {
  onClick: () => void;
}

/** 結果の見出し行の右端に置く「計算」ボタン(確率・期待値の画面への入口) */
export function EngineButton({
  onClick
}: EngineButtonProps): React.JSX.Element {
  return (
    <Button
      variant="text"
      icon={<SymbolIcon d={SYMBOL_ANALYTICS} size="1.125rem" />}
      className="result-body__engine-button"
      onClick={onClick}
    >
      計算
    </Button>
  );
}
