import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useUpsertObjectPermissionInDraftRole } from '@/settings/roles/role-permissions/object-level-permissions/hooks/useUpsertObjectPermissionInDraftRole';
import { settingsDraftRoleFamilyState } from '@/settings/roles/states/settingsDraftRoleFamilyState';
import { Select } from '@/ui/input/components/Select';
import { useAtomFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  CoreObjectNameSingular,
  FieldMetadataType,
  RelationType,
} from 'twenty-shared/types';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';

const StyledContent = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
`;

const NO_OWNER_FIELD_VALUE = '';

type SettingsRolePermissionsOwnerFieldSectionProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  roleId: string;
};

export const SettingsRolePermissionsOwnerFieldSection = ({
  objectMetadataItem,
  roleId,
}: SettingsRolePermissionsOwnerFieldSectionProps) => {
  const settingsDraftRole = useAtomFamilyStateValue(
    settingsDraftRoleFamilyState,
    roleId,
  );
  const { upsertObjectPermissionInDraftRole } =
    useUpsertObjectPermissionInDraftRole(roleId);

  const objectPermission = settingsDraftRole.objectPermissions?.find(
    (permission) =>
      permission.objectMetadataId === objectMetadataItem.id,
  );

  // Only a many-to-one relation to workspace member can be compared to the
  // current user, which is what the server-side restriction does.
  const ownerFieldOptions = objectMetadataItem.fields
    .filter(
      (field) =>
        field.type === FieldMetadataType.RELATION &&
        field.settings?.relationType === RelationType.MANY_TO_ONE &&
        field.relation?.targetObjectMetadata.nameSingular ===
          CoreObjectNameSingular.WorkspaceMember,
    )
    .map((field) => ({ label: field.label, value: field.id }))
    .sort((optionA, optionB) => optionA.label.localeCompare(optionB.label));

  const handleChange = (newOwnerFieldMetadataId: string) => {
    upsertObjectPermissionInDraftRole({
      ...objectPermission,
      __typename: 'ObjectPermission',
      objectMetadataId: objectMetadataItem.id,
      ownerFieldMetadataId:
        newOwnerFieldMetadataId === NO_OWNER_FIELD_VALUE
          ? null
          : newOwnerFieldMetadataId,
    });
  };

  return (
    <Section>
      <H2Title
        title={t`Record ownership`}
        description={t`Field that decides who owns a record. Without one, this object stays unrestricted for this role.`}
      />
      <StyledContent>
        <Select
          dropdownId={`owner-field-select-${objectMetadataItem.id}`}
          label={t`Owner field`}
          fullWidth
          value={
            objectPermission?.ownerFieldMetadataId ?? NO_OWNER_FIELD_VALUE
          }
          options={ownerFieldOptions}
          emptyOption={{ label: t`No restriction`, value: NO_OWNER_FIELD_VALUE }}
          onChange={handleChange}
        />
      </StyledContent>
    </Section>
  );
};
