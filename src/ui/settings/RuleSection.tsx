import { useId, useState } from 'react';
import type React from 'react';
import type { Rule } from '../../core/rule';
import { RULE_ITEMS } from '../../core/rule-items';
import { SYMBOL_EXPAND_MORE, SymbolIcon } from '../icons';
import { FocusRing, Ripple } from '../md';
import { PresetRow } from './PresetRow';
import { RuleItemRow } from './RuleItemRow';
import { BASIC_RULE_KEYS, DETAIL_RULE_GROUPS } from './rule-groups';
import { changedDetailLabels, formatChangedSummary } from './settings-logic';
import { useRuleSettings } from './use-rule-settings';

const RULE_ITEM_MAP = new Map(RULE_ITEMS.map(item => [item.key, item]));

export interface RuleSectionProps {
  rule?: Rule;
  initialOpen?: boolean;
  onResetToRanked?: (defaultRule: Rule) => void;
  onRuleValueChange?: <K extends keyof Rule>(key: K, value: Rule[K]) => void;
}

export function RuleSection(props: RuleSectionProps): React.JSX.Element {
  if (props.rule && props.onResetToRanked && props.onRuleValueChange) {
    return (
      <RuleSectionView
        rule={props.rule}
        initialOpen={props.initialOpen}
        onResetToRanked={props.onResetToRanked}
        onRuleValueChange={props.onRuleValueChange}
      />
    );
  }
  return <RuleSectionConnected {...props} />;
}

function RuleSectionConnected(props: RuleSectionProps): React.JSX.Element {
  const settings = useRuleSettings();
  return (
    <RuleSectionView
      rule={props.rule ?? settings.rule}
      initialOpen={props.initialOpen}
      onResetToRanked={props.onResetToRanked ?? settings.setRule}
      onRuleValueChange={props.onRuleValueChange ?? settings.setRuleValue}
    />
  );
}

interface RuleSectionViewProps {
  rule: Rule;
  initialOpen?: boolean | undefined;
  onResetToRanked: (defaultRule: Rule) => void;
  onRuleValueChange: <K extends keyof Rule>(key: K, value: Rule[K]) => void;
}

function RuleSectionView({
  rule,
  initialOpen = false,
  onResetToRanked,
  onRuleValueChange
}: RuleSectionViewProps): React.JSX.Element {
  const [open, setOpen] = useState(initialOpen);
  const summaryButtonId = useId();
  const accordionRegionId = useId();

  const changedLabels = changedDetailLabels(rule);
  const summaryText = formatChangedSummary(changedLabels);

  return (
    <section className="settings-section">
      <h2 className="settings-section__title">ルール</h2>

      {/* プリセット行 */}
      <PresetRow rule={rule} onResetToRanked={onResetToRanked} />

      {/* 基本5項目 */}
      <div className="settings-rules-group">
        {BASIC_RULE_KEYS.map(key => {
          const item = RULE_ITEM_MAP.get(key);
          if (!item) {
            return null;
          }
          return (
            <RuleItemRow
              key={key}
              item={item}
              rule={rule}
              onRuleValueChange={onRuleValueChange}
            />
          );
        })}
      </div>

      {/* 詳細設定アコーディオン */}
      <div className="settings-accordion">
        <button
          type="button"
          id={summaryButtonId}
          aria-expanded={open}
          aria-controls={accordionRegionId}
          className="settings-accordion__summary"
          onClick={() => setOpen(prev => !prev)}
        >
          <Ripple />
          <FocusRing />
          <div className="settings-accordion__summary-text">
            <span className="settings-accordion__summary-title">詳細設定</span>
            {!open && summaryText && (
              <span className="settings-accordion__summary-subtext">
                {summaryText}
              </span>
            )}
          </div>
          <span
            className={`settings-accordion__expand-icon ${
              open ? 'settings-accordion__expand-icon--expanded' : ''
            }`}
          >
            <SymbolIcon d={SYMBOL_EXPAND_MORE} size="1.5rem" />
          </span>
        </button>

        <div
          // biome-ignore lint/a11y/useSemanticElements: 設計書 §4.3 で指定された WAI-ARIA region パターンのため
          role="region"
          id={accordionRegionId}
          aria-labelledby={summaryButtonId}
          hidden={!open}
          className="settings-accordion__content"
        >
          {DETAIL_RULE_GROUPS.map(group => (
            <div key={group.id} className="settings-detail-group">
              <h3 className="settings-detail-group__title">{group.title}</h3>
              {group.keys.map(key => {
                const item = RULE_ITEM_MAP.get(key);
                if (!item) {
                  return null;
                }
                return (
                  <RuleItemRow
                    key={key}
                    item={item}
                    rule={rule}
                    onRuleValueChange={onRuleValueChange}
                  />
                );
              })}

              {group.subgroups?.map(subgroup => {
                const subgroupId = `subgroup-${subgroup.id}-title`;
                const subgroupNoteId = `subgroup-${subgroup.id}-note`;
                return (
                  <div
                    // biome-ignore lint/a11y/useSemanticElements: 設計書 §4.3 で指定された WAI-ARIA group パターンのため
                    role="group"
                    key={subgroup.id}
                    aria-labelledby={subgroupId}
                    aria-describedby={
                      subgroup.note ? subgroupNoteId : undefined
                    }
                    className="settings-detail-subgroup"
                  >
                    <div className="settings-detail-subgroup__header">
                      <h4
                        id={subgroupId}
                        className="settings-detail-subgroup__title"
                      >
                        {subgroup.title}
                      </h4>
                      {subgroup.note && (
                        <p
                          id={subgroupNoteId}
                          className="settings-detail-subgroup__note"
                        >
                          {subgroup.note}
                        </p>
                      )}
                    </div>
                    {subgroup.keys.map(key => {
                      const item = RULE_ITEM_MAP.get(key);
                      if (!item) {
                        return null;
                      }
                      return (
                        <RuleItemRow
                          key={key}
                          item={item}
                          rule={rule}
                          onRuleValueChange={onRuleValueChange}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
