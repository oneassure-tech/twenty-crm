import { SettingsOptionCardContentToggle } from '@/settings/components/SettingsOptions/SettingsOptionCardContentToggle';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { styled } from '@linaria/react';
import { isDefined } from 'twenty-shared/utils';
import { t } from '@lingui/core/macro';
import { IconUserCircle } from 'twenty-ui/icon';
import { Section } from 'twenty-ui/layout';
import { Card } from 'twenty-ui/surfaces';
import { H2Title } from 'twenty-ui/typography';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCardContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[4]};
`;

type SettingsRolePermissionsOwnedRecordsSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsOwnedRecordsSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsOwnedRecordsSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const restrictedObjectCount =
    settingsDraftRole.objectPermissions?.filter((objectPermission) =>
      isDefined(objectPermission.ownerFieldMetadataId),
    ).length ?? 0;

  const description = settingsDraftRole.canOnlyAccessOwnedObjectRecords
    ? restrictedObjectCount > 0
      ? t`Restricted on ${restrictedObjectCount} object(s). Pick an owner field on an object to restrict it.`
      : t`No object has an owner field yet — pick one on an object to restrict it.`
    : t`Limit this role to records it owns, for reading as well as editing and deleting.`;

  return (
    <Section>
      <H2Title
        title={t`Record ownership`}
        description={t`Restrict this role to the records it owns`}
      />
      <StyledCardContainer>
        <Card rounded>
          <SettingsOptionCardContentToggle
            Icon={IconUserCircle}
            title={t`Only records they own`}
            description={description}
            checked={settingsDraftRole.canOnlyAccessOwnedObjectRecords}
            disabled={!isEditable}
            onChange={() => {
              setSettingsDraftRole({
                ...settingsDraftRole,
                canOnlyAccessOwnedObjectRecords:
                  !settingsDraftRole.canOnlyAccessOwnedObjectRecords,
              });
            }}
          />
        </Card>
      </StyledCardContainer>
    </Section>
  );
};
