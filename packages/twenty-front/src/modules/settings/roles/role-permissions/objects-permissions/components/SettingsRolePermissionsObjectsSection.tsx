import { SettingsOptionCardContentToggle } from '@/settings/components/SettingsOptions/SettingsOptionCardContentToggle';
import { SettingsRolePermissionsObjectsTableHeader } from '@/settings/roles/role-permissions/objects-permissions/components/SettingsRolePermissionsObjectsTableHeader';
import { SettingsRolePermissionsObjectsTableRow } from '@/settings/roles/role-permissions/objects-permissions/components/SettingsRolePermissionsObjectsTableRow';
import { type SettingsRolePermissionsObjectPermission } from '@/settings/roles/role-permissions/objects-permissions/types/SettingsRolePermissionsObjectPermission';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { useSetAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useSetAtomFamilyState';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { IconUserCircle } from 'twenty-ui/icon';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { Card } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTable = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledTableRows = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledCardContainer = styled.div`
  margin-top: ${themeCssVariables.spacing[4]};
`;

type SettingsRolePermissionsObjectsSectionProps = {
  roleId: string;
  isEditable: boolean;
};

export const SettingsRolePermissionsObjectsSection = ({
  roleId,
  isEditable,
}: SettingsRolePermissionsObjectsSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const setSettingsDraftRole = useSetAtomFamilyState(
    settingsDraftRoleFamilyState,
    roleId,
  );

  const objectPermissions = settingsDraftRole.objectPermissions;

  const objectPermissionsConfig: SettingsRolePermissionsObjectPermission[] = [
    {
      key: 'canReadObjectRecords',
      label: t`See Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canReadObjectRecords === true &&
            settingsDraftRole.canReadAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canReadObjectRecords === false &&
            settingsDraftRole.canReadAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canReadAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canReadAllObjectRecords: value,
          ...(value === false
            ? {
                canUpdateAllObjectRecords: value,
                canSoftDeleteAllObjectRecords: value,
                canDestroyAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canUpdateObjectRecords',
      label: t`Edit Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canUpdateObjectRecords === true &&
            settingsDraftRole.canUpdateAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canUpdateObjectRecords === false &&
            settingsDraftRole.canUpdateAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canUpdateAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canUpdateAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canSoftDeleteObjectRecords',
      label: t`Delete Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canSoftDeleteObjectRecords === true &&
            settingsDraftRole.canSoftDeleteAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canSoftDeleteObjectRecords === false &&
            settingsDraftRole.canSoftDeleteAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canSoftDeleteAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canSoftDeleteAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
    {
      key: 'canDestroyObjectRecords',
      label: t`Destroy Records on All Objects`,
      grantedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canDestroyObjectRecords === true &&
            settingsDraftRole.canDestroyAllObjectRecords === false,
        )?.length ?? 0,
      revokedBy:
        objectPermissions?.filter(
          (permission) =>
            permission.canDestroyObjectRecords === false &&
            settingsDraftRole.canDestroyAllObjectRecords === true,
        )?.length ?? 0,
      value: settingsDraftRole.canDestroyAllObjectRecords,
      setValue: (value: boolean) => {
        setSettingsDraftRole({
          ...settingsDraftRole,
          canDestroyAllObjectRecords: value,
          ...(value === true
            ? {
                canReadAllObjectRecords: value,
              }
            : {}),
        });
      },
    },
  ];

  return (
    <Section>
      <H2Title
        title={t`Objects`}
        description={t`Objects and fields permissions settings`}
      />
      <StyledTable>
        <SettingsRolePermissionsObjectsTableHeader
          roleId={roleId}
          objectPermissionsConfig={objectPermissionsConfig}
          isEditable={isEditable}
        />
        <StyledTableRows>
          {objectPermissionsConfig.map((permission) => (
            <SettingsRolePermissionsObjectsTableRow
              key={permission.key}
              permission={permission}
              isEditable={isEditable}
            />
          ))}
        </StyledTableRows>
      </StyledTable>
      <StyledCardContainer>
        <Card rounded>
          <SettingsOptionCardContentToggle
            Icon={IconUserCircle}
            title={t`Only see records they own`}
            description={t`Applies only to objects having an Owner field linked to Workspace Member. On those, members with this role see records they own and nothing else, in lists, search and the API alike. Objects without an Owner field stay fully visible.`}
            checked={settingsDraftRole.restrictToOwnedRecords === true}
            disabled={!isEditable}
            onChange={() => {
              setSettingsDraftRole({
                ...settingsDraftRole,
                restrictToOwnedRecords:
                  !settingsDraftRole.restrictToOwnedRecords,
              });
            }}
          />
        </Card>
      </StyledCardContainer>
    </Section>
  );
};
