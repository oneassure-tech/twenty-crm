import { RecordVisibilityRuleKey } from 'twenty-shared/types';

import { ownRecordsOnlyRule } from 'src/engine/twenty-orm/record-visibility/rules/own-records-only.rule';
import { type RecordVisibilityRule } from 'src/engine/twenty-orm/record-visibility/types/record-visibility-rule.type';

// Adding a RecordVisibilityRuleKey member fails to compile until its rule is
// registered here.
export const RECORD_VISIBILITY_RULES = {
  [RecordVisibilityRuleKey.OWN_RECORDS_ONLY]: ownRecordsOnlyRule,
} as const satisfies Record<RecordVisibilityRuleKey, RecordVisibilityRule>;
