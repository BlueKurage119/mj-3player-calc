import { useRef, useState } from 'react';
import type React from 'react';
import { Divider, IconButton, Menu, MenuItem } from '../md';
import { useAppDispatch } from '../state';

export interface AppHeaderProps {
  headerRef?: React.Ref<HTMLElement>;
}

export function AppHeader({ headerRef }: AppHeaderProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLElement | null>(null);

  return (
    <header ref={headerRef} className="app-header">
      <div className="app-header__inner">
        <h1 className="app-header__title">三麻点数計算機</h1>
        <div className="app-header__actions">
          <IconButton
            ref={menuAnchorRef}
            variant="standard"
            label="メニュー"
            className="app-header__menu-button"
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <svg
              viewBox="0 0 24 24"
              width="1.5rem"
              height="1.5rem"
              aria-hidden="true"
            >
              <path
                d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                fill="currentColor"
              />
            </svg>
          </IconButton>
          <Menu
            open={menuOpen}
            anchor={menuAnchorRef}
            onClose={() => setMenuOpen(false)}
          >
            <MenuItem
              className="app-header__menu-item"
              onSelect={() => {
                setMenuOpen(false);
                dispatch({ type: 'navigate', screen: 'settings' });
              }}
            >
              設定
            </MenuItem>
            <Divider />
            <MenuItem
              className="app-header__menu-item"
              onSelect={() => {
                setMenuOpen(false);
                dispatch({ type: 'clear-all' });
              }}
            >
              オールクリア
            </MenuItem>
          </Menu>
        </div>
      </div>
    </header>
  );
}
