import type {
  MdFilledButton,
  MdFilledTonalButton,
  MdOutlinedButton,
  MdTextButton
} from '@material/web/button/filled-button.js';
import type { MdAssistChip } from '@material/web/chips/assist-chip.js';
import type { MdChipSet } from '@material/web/chips/chip-set.js';
import type { MdFilterChip } from '@material/web/chips/filter-chip.js';
import type { MdDialog } from '@material/web/dialog/dialog.js';
import type { MdDivider } from '@material/web/divider/divider.js';
import type { MdFocusRing } from '@material/web/focus/md-focus-ring.js';
import type {
  MdFilledIconButton,
  MdFilledTonalIconButton,
  MdIconButton,
  MdOutlinedIconButton
} from '@material/web/iconbutton/icon-button.js';
import type { MdMenuItem } from '@material/web/menu/menu-item.js';
import type { MdMenu } from '@material/web/menu/menu.js';
import type { MdRipple } from '@material/web/ripple/ripple.js';
import type { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import type { MdSelectOption } from '@material/web/select/select-option.js';
import type { MdSwitch } from '@material/web/switch/switch.js';
import type { MdPrimaryTab } from '@material/web/tabs/primary-tab.js';
import type { MdTabs } from '@material/web/tabs/tabs.js';
import type React from 'react';

interface CustomElementBaseProps<T extends HTMLElement> {
  ref?: React.Ref<T> | undefined;
  children?: React.ReactNode | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
  slot?: string | undefined;
  id?: string | undefined;
  tabIndex?: number | undefined;
  role?: string | undefined;
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  'aria-hidden'?: boolean | 'true' | 'false' | undefined;
  onClick?: React.MouseEventHandler<HTMLElement> | undefined;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': CustomElementBaseProps<MdFilledButton> & {
        disabled?: boolean | undefined;
        type?: 'button' | 'submit' | 'reset' | undefined;
      };
      'md-filled-tonal-button': CustomElementBaseProps<MdFilledTonalButton> & {
        disabled?: boolean | undefined;
        type?: 'button' | 'submit' | 'reset' | undefined;
      };
      'md-outlined-button': CustomElementBaseProps<MdOutlinedButton> & {
        disabled?: boolean | undefined;
        type?: 'button' | 'submit' | 'reset' | undefined;
      };
      'md-text-button': CustomElementBaseProps<MdTextButton> & {
        disabled?: boolean | undefined;
        type?: 'button' | 'submit' | 'reset' | undefined;
      };

      'md-icon-button': CustomElementBaseProps<MdIconButton> & {
        disabled?: boolean | undefined;
        toggle?: boolean | undefined;
        selected?: boolean | undefined;
      };
      'md-filled-icon-button': CustomElementBaseProps<MdFilledIconButton> & {
        disabled?: boolean | undefined;
        toggle?: boolean | undefined;
        selected?: boolean | undefined;
      };
      'md-filled-tonal-icon-button': CustomElementBaseProps<MdFilledTonalIconButton> & {
        disabled?: boolean | undefined;
        toggle?: boolean | undefined;
        selected?: boolean | undefined;
      };
      'md-outlined-icon-button': CustomElementBaseProps<MdOutlinedIconButton> & {
        disabled?: boolean | undefined;
        toggle?: boolean | undefined;
        selected?: boolean | undefined;
      };

      'md-chip-set': CustomElementBaseProps<MdChipSet>;
      'md-filter-chip': CustomElementBaseProps<MdFilterChip> & {
        disabled?: boolean | undefined;
        selected?: boolean | undefined;
        label?: string | undefined;
      };
      'md-assist-chip': CustomElementBaseProps<MdAssistChip> & {
        disabled?: boolean | undefined;
        label?: string | undefined;
      };

      'md-switch': CustomElementBaseProps<MdSwitch> & {
        disabled?: boolean | undefined;
        selected?: boolean | undefined;
      };

      'md-dialog': CustomElementBaseProps<MdDialog> & {
        open?: boolean | undefined;
      };

      'md-tabs': CustomElementBaseProps<MdTabs> & {
        activeTabIndex?: number | undefined;
      };
      'md-primary-tab': CustomElementBaseProps<MdPrimaryTab>;

      'md-outlined-select': CustomElementBaseProps<MdOutlinedSelect> & {
        label?: string | undefined;
        value?: string | undefined;
        disabled?: boolean | undefined;
      };
      'md-select-option': CustomElementBaseProps<MdSelectOption> & {
        value?: string | undefined;
        selected?: boolean | undefined;
      };

      'md-divider': CustomElementBaseProps<MdDivider> & {
        inset?: boolean | undefined;
      };

      'md-ripple': CustomElementBaseProps<MdRipple> & {
        disabled?: boolean | undefined;
      };
      'md-focus-ring': CustomElementBaseProps<MdFocusRing> & {
        inward?: boolean | undefined;
      };

      'md-menu': CustomElementBaseProps<MdMenu> & {
        open?: boolean | undefined;
        positioning?: 'absolute' | 'fixed' | 'document' | 'popover' | undefined;
        anchor?: string | undefined;
      };
      'md-menu-item': CustomElementBaseProps<MdMenuItem> & {
        disabled?: boolean | undefined;
      };
    }
  }
}
