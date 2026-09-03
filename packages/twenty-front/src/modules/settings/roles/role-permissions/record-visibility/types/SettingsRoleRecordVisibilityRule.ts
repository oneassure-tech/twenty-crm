import { type RecordVisibilityRuleKey } from 'twenty-shared/types';
import { type IconComponent } from 'twenty-ui/icon';

export type SettingsRoleRecordVisibilityRule = {
  key: RecordVisibilityRuleKey;
  name: string;
  description: string;
  Icon: IconComponent;
};
