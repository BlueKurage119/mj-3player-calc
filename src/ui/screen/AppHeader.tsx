import { useRef, useState } from 'react';
import type React from 'react';
import { SYMBOL_MORE_VERT, SymbolIcon } from '../icons';
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
            <SymbolIcon d={SYMBOL_MORE_VERT} />
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
