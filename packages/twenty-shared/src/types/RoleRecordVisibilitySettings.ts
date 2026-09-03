import { type RecordVisibilityRuleKey } from '@/types/RecordVisibilityRuleKey';

// Per-rule configuration stored on a role. Rules may read extra keys off this
// object for parameterised behaviour, which is why it stays open-ended.
export type RecordVisibilityRuleConfig = {
  enabled: boolean;
} & Record<string, unknown>;

export type RoleRecordVisibilitySettings = Partial<
  Record<RecordVisibilityRuleKey, RecordVisibilityRuleConfig>
>;
