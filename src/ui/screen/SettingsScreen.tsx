import type React from 'react';
import { SYMBOL_ARROW_BACK, SymbolIcon } from '../icons';
import { Divider, IconButton } from '../md';
import { HelpTooltipScope, RuleSection, ThemeSection } from '../settings';
import { useAppDispatch, useRuleLoadNotice } from '../state';
import '../settings/settings.css';
import './main-screen.css';

export function SettingsScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { show: showNotice } = useRuleLoadNotice();

  return (
    <div className="settings-screen">
      <header className="app-header">
        <div className="app-header__inner app-header__inner--start">
          <IconButton
            variant="standard"
            label="戻る"
            className="settings-screen__back-button"
            onClick={() => dispatch({ type: 'navigate', screen: 'main' })}
          >
            <SymbolIcon d={SYMBOL_ARROW_BACK} />
          </IconButton>
          <h1 className="app-header__title">設定</h1>
        </div>
      </header>
      <main className="main-screen settings-screen__content">
        <HelpTooltipScope>
          {showNotice && (
            /* biome-ignore lint/a11y/useSemanticElements: 設計書 §5.2 で指定された WAI-ARIA status パターンのため */
            <p role="status" className="settings-notice">
              保存されていたルールを読み込めなかったため、既定値で補いました
            </p>
          )}
          <ThemeSection />
          <Divider />
          <RuleSection />
        </HelpTooltipScope>
      </main>
    </div>
  );
}

export default SettingsScreen;
