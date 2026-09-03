import {
  FieldMetadataType,
  RecordVisibilityRuleKey,
  RelationType,
} from 'twenty-shared/types';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { resolveRecordVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/utils/resolve-record-visibility-predicate.util';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

const ROLE_ID = 'role-1';
const WORKSPACE_MEMBER_ID = 'member-1';
const LEAD_OBJECT_ID = 'object-lead';
const WORKSPACE_MEMBER_OBJECT_ID = 'object-workspace-member';
const OWNER_FIELD_ID = 'field-owner';

const buildMaps = <T extends { id: string; universalIdentifier: string }>(
  entities: T[],
): FlatEntityMaps<never> =>
  ({
    byUniversalIdentifier: Object.fromEntries(
      entities.map((entity) => [entity.universalIdentifier, entity]),
    ),
    universalIdentifierById: Object.fromEntries(
      entities.map((entity) => [entity.id, entity.universalIdentifier]),
    ),
    universalIdentifiersByApplicationId: {},
    // oxlint-disable-next-line typescript/no-explicit-any
  }) as any;

const buildRole = (overrides: Partial<FlatRole> = {}): FlatRole =>
  ({
    id: ROLE_ID,
    universalIdentifier: 'role-uid-1',
    recordVisibilitySettings: {
      [RecordVisibilityRuleKey.OWN_RECORDS_ONLY]: { enabled: true },
    },
    ...overrides,
    // oxlint-disable-next-line typescript/no-explicit-any
  }) as any;

const leadObjectMetadata = {
  id: LEAD_OBJECT_ID,
  universalIdentifier: 'object-lead-uid',
  nameSingular: 'lead',
  fieldIds: [OWNER_FIELD_ID],
  // oxlint-disable-next-line typescript/no-explicit-any
} as any as FlatObjectMetadata;

const workspaceMemberObjectMetadata = {
  id: WORKSPACE_MEMBER_OBJECT_ID,
  universalIdentifier: 'object-workspace-member-uid',
  nameSingular: 'workspaceMember',
  fieldIds: [],
  // oxlint-disable-next-line typescript/no-explicit-any
} as any as FlatObjectMetadata;

const ownerField = {
  id: OWNER_FIELD_ID,
  universalIdentifier: 'field-owner-uid',
  name: 'owner',
  type: FieldMetadataType.RELATION,
  objectMetadataId: LEAD_OBJECT_ID,
  relationTargetObjectMetadataId: WORKSPACE_MEMBER_OBJECT_ID,
  settings: { relationType: RelationType.MANY_TO_ONE },
  // oxlint-disable-next-line typescript/no-explicit-any
} as any as FlatFieldMetadata;

const flatObjectMetadataMaps = buildMaps([
  leadObjectMetadata,
  workspaceMemberObjectMetadata,
  // oxlint-disable-next-line typescript/no-explicit-any
]) as any as FlatEntityMaps<FlatObjectMetadata>;

const flatFieldMetadataMaps = buildMaps([
  ownerField,
  // oxlint-disable-next-line typescript/no-explicit-any
]) as any as FlatEntityMaps<FlatFieldMetadata>;

const resolve = (args: {
  role: FlatRole;
  objectMetadata?: FlatObjectMetadata;
  workspaceMemberId?: string | undefined;
  roleId?: string | undefined;
}) => {
  const { role } = args;
  const objectMetadata = args.objectMetadata ?? leadObjectMetadata;
  // `in` rather than a default, so an explicit undefined is preserved.
  const workspaceMemberId =
    'workspaceMemberId' in args ? args.workspaceMemberId : WORKSPACE_MEMBER_ID;
  const roleId = 'roleId' in args ? args.roleId : ROLE_ID;

  return resolveRecordVisibilityPredicate({
    roleId,
    // oxlint-disable-next-line typescript/no-explicit-any
    flatRoleMaps: buildMaps([role]) as any as FlatEntityMaps<FlatRole>,
    objectMetadata,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    workspaceMemberId,
  });
};

describe('resolveRecordVisibilityPredicate', () => {
  it('should restrict to the acting workspace member when the rule is enabled', () => {
    expect(resolve({ role: buildRole() })).toEqual({
      kind: 'predicate',
      predicate: {
        kind: 'field',
        fieldName: 'owner',
        columnName: 'ownerId',
        comparison: { operator: 'equals', value: WORKSPACE_MEMBER_ID },
      },
    });
  });

  it('should not restrict when the rule is disabled', () => {
    expect(
      resolve({
        role: buildRole({
          recordVisibilitySettings: {
            [RecordVisibilityRuleKey.OWN_RECORDS_ONLY]: { enabled: false },
          },
        }),
      }),
    ).toEqual({ kind: 'unrestricted' });
  });

  it('should not restrict when the role has no settings at all', () => {
    expect(
      resolve({ role: buildRole({ recordVisibilitySettings: {} }) }),
    ).toEqual({ kind: 'unrestricted' });
  });

  it('should never restrict the admin role, even when the rule is stored as enabled', () => {
    expect(
      resolve({
        role: buildRole({
          universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
        }),
      }),
    ).toEqual({ kind: 'unrestricted' });
  });

  it('should not restrict an object without an owner field', () => {
    expect(
      resolve({
        role: buildRole(),
        objectMetadata: workspaceMemberObjectMetadata,
      }),
    ).toEqual({ kind: 'unrestricted' });
  });

  it('should fail closed when there is no acting workspace member', () => {
    expect(
      resolve({ role: buildRole(), workspaceMemberId: undefined }),
    ).toEqual({ kind: 'denyAll' });
  });

  it('should not restrict when no role can be resolved', () => {
    expect(resolve({ role: buildRole(), roleId: undefined })).toEqual({
      kind: 'unrestricted',
    });
  });
});
