import { useRecordVisibilityRuleConfig } from '@/settings/roles/role-permissions/record-visibility/hooks/useRecordVisibilityRuleConfig';
import { SettingsRolePermissionsRecordVisibilityTableRow } from '@/settings/roles/role-permissions/record-visibility/components/SettingsRolePermissionsRecordVisibilityTableRow';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { type RecordVisibilityRuleKey } from 'twenty-shared/types';

const StyledTable = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledTableRows = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

type SettingsRolePermissionsRecordVisibilitySectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsRecordVisibilitySection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsRecordVisibilitySectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const recordVisibilityRules = useRecordVisibilityRuleConfig();

  const recordVisibilitySettings =
    settingsDraftRole.recordVisibilitySettings ?? {};

  const handleChange = (ruleKey: RecordVisibilityRuleKey, value: boolean) => {
    setSettingsDraftRole({
      ...settingsDraftRole,
      recordVisibilitySettings: {
        ...recordVisibilitySettings,
        [ruleKey]: {
          ...(recordVisibilitySettings[ruleKey] ?? {}),
          enabled: value,
        },
      },
    });
  };

  return (
    <Section>
      <H2Title
        title={t`Record visibility`}
        description={t`Limit which records this role can see and edit`}
      />
      <StyledTable>
        <StyledTableRows>
          {recordVisibilityRules.map((rule) => (
            <SettingsRolePermissionsRecordVisibilityTableRow
              key={rule.key}
              rule={rule}
              value={recordVisibilitySettings[rule.key]?.enabled === true}
              isEditable={isEditable}
              onChange={(value) => handleChange(rule.key, value)}
            />
          ))}
        </StyledTableRows>
      </StyledTable>
    </Section>
  );
};
