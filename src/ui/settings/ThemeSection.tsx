import type React from 'react';
import { ConnectedButtonGroup } from '../expressive/ConnectedButtonGroup';
import type { ThemePreference } from '../theme';
import { useTheme } from '../theme';

const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'auto', label: '自動' },
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' }
];

export function ThemeSection(): React.JSX.Element {
  const { preference, setPreference } = useTheme();

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">テーマ</h2>
      <div className="settings-theme-row">
        <ConnectedButtonGroup<ThemePreference>
          label="テーマ"
          options={THEME_OPTIONS}
          value={preference}
          onValueChange={setPreference}
        />
      </div>
    </section>
  );
}
