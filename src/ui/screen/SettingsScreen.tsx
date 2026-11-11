import type React from 'react';
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
            <svg
              viewBox="0 0 24 24"
              width="1.5rem"
              height="1.5rem"
              aria-hidden="true"
            >
              <path
                d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                fill="currentColor"
              />
            </svg>
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
