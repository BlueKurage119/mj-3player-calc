import type React from 'react';
import { IconButton } from '../md';
import { useAppDispatch } from '../state';
import './main-screen.css';

export function SettingsScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <div className="settings-screen">
      <header className="app-header">
        <div className="app-header__inner">
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
      <main className="main-screen" data-slot="settings-content" />
    </div>
  );
}
