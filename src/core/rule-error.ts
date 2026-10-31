import type { RuleIssue } from './rule';

/** validateRule が問題を返したときに generateResult が投げる例外 */
export class RuleValidationError extends Error {
  readonly issues: RuleIssue[];
  constructor(issues: RuleIssue[]) {
    super(`ルールが不正です: ${issues.map(i => i.message).join('、')}`);
    this.name = 'RuleValidationError';
    this.issues = issues;
  }
}
