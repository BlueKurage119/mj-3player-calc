import { useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { MdPrimaryTab } from '@material/web/tabs/primary-tab.js';
import { MdTabs } from '@material/web/tabs/tabs.js';
import { setRef } from './ref-utils';

const REGISTERED = [MdTabs, MdPrimaryTab] as const;

export const __registered = REGISTERED;

export interface TabsProps {
  ref?: React.Ref<HTMLElement> | undefined;
  activeIndex: number;
  onActiveIndexChange?: ((index: number) => void) | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function Tabs(props: TabsProps): React.JSX.Element {
  const { ref, activeIndex, onActiveIndexChange, children, className } = props;
  const innerRef = useRef<MdTabs | null>(null);

  const handleRef = (el: MdTabs | null) => {
    innerRef.current = el;
    setRef(ref, el);
  };

  useLayoutEffect(() => {
    if (innerRef.current) {
      innerRef.current.activeTabIndex = activeIndex;
    }
  });

  useEffect(() => {
    const el = innerRef.current;
    if (!el || !onActiveIndexChange) {
      return;
    }

    const handleChange = () => {
      const nextIndex = el.activeTabIndex;
      // 要素側の代入によるイベント発火をガードする
      if (nextIndex !== activeIndex) {
        onActiveIndexChange(nextIndex);
      }
    };

    el.addEventListener('change', handleChange);
    return () => {
      el.removeEventListener('change', handleChange);
    };
  }, [activeIndex, onActiveIndexChange]);

  return (
    <md-tabs ref={handleRef} activeTabIndex={activeIndex} className={className}>
      {children}
    </md-tabs>
  );
}

export function PrimaryTab(props: {
  ref?: React.Ref<HTMLElement> | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}): React.JSX.Element {
  const { ref, children, className } = props;
  const handleRef = (el: HTMLElement | null) => {
    setRef(ref, el);
  };
  return (
    <md-primary-tab ref={handleRef} className={className}>
      {children}
    </md-primary-tab>
  );
}
