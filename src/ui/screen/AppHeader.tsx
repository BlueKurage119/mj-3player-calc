import { useRef, useState } from 'react';
import type React from 'react';
import { SYMBOL_MORE_VERT, SymbolIcon } from '../icons';
import { Divider, IconButton, Menu, MenuItem } from '../md';
import { type AppAction, useAppDispatch } from '../state';

export type HeaderMenuItemId =
  | 'settings'
  | 'random14'
  | 'chinitsu'
  | 'clear-all';

export type HeaderMenuEntry =
  | { type: 'divider' }
  | { type: 'item'; id: HeaderMenuItemId; label: string };

const HEADER_MENU_ENTRIES: readonly HeaderMenuEntry[] = [
  { type: 'item', id: 'settings', label: '設定' },
  { type: 'divider' },
  { type: 'item', id: 'random14', label: 'ランダム14枚' },
  { type: 'item', id: 'chinitsu', label: 'ランダム清一色' },
  { type: 'divider' },
  { type: 'item', id: 'clear-all', label: 'オールクリア' }
];

const HEADER_MENU_ACTIONS: Record<HeaderMenuItemId, AppAction> = {
  settings: { type: 'navigate', screen: 'settings' },
  random14: { type: 'set-random-hand', kind: 'random14' },
  chinitsu: { type: 'set-random-hand', kind: 'chinitsu' },
  'clear-all': { type: 'clear-all' }
};

/** ヘッダーメニュー項目の定義(文言・種別・Divider の位置)を返す */
export function getHeaderMenuEntries(): readonly HeaderMenuEntry[] {
  return HEADER_MENU_ENTRIES;
}

/** ヘッダーメニュー項目選択時の処理(メニューを閉じてアクションを dispatch する) */
export function selectHeaderMenuItem(
  id: HeaderMenuItemId,
  closeMenu: () => void,
  dispatch: (action: AppAction) => void
): void {
  closeMenu();
  dispatch(HEADER_MENU_ACTIONS[id]);
}

export interface AppHeaderProps {
  headerRef?: React.Ref<HTMLElement>;
}

export function AppHeader({ headerRef }: AppHeaderProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLElement | null>(null);
  const closeMenu = () => setMenuOpen(false);

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
          <Menu open={menuOpen} anchor={menuAnchorRef} onClose={closeMenu}>
            {getHeaderMenuEntries().map((entry, index) =>
              entry.type === 'divider' ? (
                <Divider key={`divider-${index}`} />
              ) : (
                <MenuItem
                  key={entry.id}
                  className="app-header__menu-item"
                  onSelect={() =>
                    selectHeaderMenuItem(entry.id, closeMenu, dispatch)
                  }
                >
                  {entry.label}
                </MenuItem>
              )
            )}
          </Menu>
        </div>
      </div>
    </header>
  );
}
