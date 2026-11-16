import { Fragment } from 'react';
import type React from 'react';
import { Disclosure } from '../expressive';
import { SYMBOL_ARROW_BACK, SymbolIcon } from '../icons';
import {
  CREDIT_GROUPS,
  LICENSE_LABELS,
  LICENSE_TEXTS
} from '../license/license-data';
import { Divider, IconButton } from '../md';
import { useAppDispatch, useAppState } from '../state';
import '../license/license.css';
import './main-screen.css';

export interface LicenseViewProps {
  onBack: () => void;
}

/** ライセンス画面の描画本体(props のみで描画し、テスト可能にする) */
export function LicenseView({ onBack }: LicenseViewProps): React.JSX.Element {
  return (
    <div className="license-screen">
      <header className="app-header">
        <div className="app-header__inner app-header__inner--start">
          <IconButton
            variant="standard"
            label="戻る"
            className="license-screen__back-button"
            onClick={onBack}
          >
            <SymbolIcon d={SYMBOL_ARROW_BACK} />
          </IconButton>
          <h1 className="app-header__title">ライセンス</h1>
        </div>
      </header>
      <main className="license-screen__content">
        {CREDIT_GROUPS.map((group, groupIndex) => (
          <Fragment key={group.title}>
            {groupIndex > 0 && <Divider />}
            <section className="license-screen__section">
              <h2 className="license-screen__section-title">{group.title}</h2>
              <ul className="license-screen__list">
                {group.entries.map(entry => (
                  <li
                    key={entry.name ?? group.title}
                    className="license-screen__item"
                  >
                    {entry.name !== undefined && (
                      <div className="license-screen__name">{entry.name}</div>
                    )}
                    <div className="license-screen__license">
                      {LICENSE_LABELS[entry.license]}
                    </div>
                    {entry.copyrights.map(line => (
                      <div key={line} className="license-screen__copyright">
                        {line}
                      </div>
                    ))}
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="license-screen__url"
                    >
                      {entry.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </Fragment>
        ))}
        <Divider />
        <section className="license-screen__section">
          <h2 className="license-screen__section-title">ライセンス全文</h2>
          <div className="license-screen__disclosures">
            {LICENSE_TEXTS.map(item => (
              <Disclosure key={item.id} summary={item.title}>
                {item.id === 'MIT' && (
                  <p className="license-screen__preamble">
                    各項目の著作権表示と、次の許諾文が適用されます。
                  </p>
                )}
                <pre className="license-screen__fulltext">{item.text}</pre>
              </Disclosure>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/** 第三者ライセンス画面 */
export function LicenseScreen(): React.JSX.Element {
  const { returnScreen } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <LicenseView
      onBack={() => dispatch({ type: 'navigate', screen: returnScreen })}
    />
  );
}

export default LicenseScreen;
