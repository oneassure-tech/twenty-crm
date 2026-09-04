// Keys of the record-visibility rules a role can enable.
// Each key must have a matching rule registered server-side in
// twenty-orm/record-visibility/record-visibility-rules.constant.ts
export enum RecordVisibilityRuleKey {
  OWN_RECORDS_ONLY = 'OWN_RECORDS_ONLY',
}
