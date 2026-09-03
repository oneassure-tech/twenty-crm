import { type SettingsRoleRecordVisibilityRule } from '@/settings/roles/role-permissions/record-visibility/types/SettingsRoleRecordVisibilityRule';
import { t } from '@lingui/core/macro';
import { useMemo } from 'react';
import { IconUserCircle } from 'twenty-ui/icon';
import { RecordVisibilityRuleKey } from 'twenty-shared/types';

// Adding a record-visibility rule means adding one entry here; the section and
// row components need no change.
export const useRecordVisibilityRuleConfig =
  (): SettingsRoleRecordVisibilityRule[] => {
    return useMemo(
      () => [
        {
          key: RecordVisibilityRuleKey.OWN_RECORDS_ONLY,
          name: t`Only own records`,
          description: t`Members see only records where they are the Owner. Applies to every object with an Owner field.`,
          Icon: IconUserCircle,
        },
      ],
      [],
    );
  };
