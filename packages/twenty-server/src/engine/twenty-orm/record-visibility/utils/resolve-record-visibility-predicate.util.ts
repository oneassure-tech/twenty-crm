import {
  type RecordVisibilityRuleKey,
  type RoleRecordVisibilitySettings,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { RECORD_VISIBILITY_RULES } from 'src/engine/twenty-orm/record-visibility/record-visibility-rules.constant';
import { type RecordVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/types/record-visibility-predicate.type';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

export type ResolvedRecordVisibility =
  | { kind: 'unrestricted' }
  | { kind: 'denyAll' }
  | { kind: 'predicate'; predicate: RecordVisibilityPredicate };

const UNRESTRICTED: ResolvedRecordVisibility = { kind: 'unrestricted' };

export const resolveRecordVisibilityPredicate = ({
  roleId,
  flatRoleMaps,
  objectMetadata,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
  workspaceMemberId,
}: {
  roleId: string | undefined;
  flatRoleMaps: FlatEntityMaps<FlatRole>;
  objectMetadata: FlatObjectMetadata;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  workspaceMemberId: string | undefined;
}): ResolvedRecordVisibility => {
  if (!isDefined(roleId)) {
    return UNRESTRICTED;
  }

  const flatRole = findFlatEntityByIdInFlatEntityMaps<FlatRole>({
    flatEntityId: roleId,
    flatEntityMaps: flatRoleMaps,
  });

  if (!isDefined(flatRole)) {
    return UNRESTRICTED;
  }

  // The admin role is permanent and must always see everything, whatever is
  // stored against it.
  if (
    flatRole.universalIdentifier === STANDARD_ROLE.admin.universalIdentifier
  ) {
    return UNRESTRICTED;
  }

  const recordVisibilitySettings: RoleRecordVisibilitySettings =
    flatRole.recordVisibilitySettings ?? {};

  const predicates: RecordVisibilityPredicate[] = [];

  for (const [ruleKey, ruleConfig] of Object.entries(
    recordVisibilitySettings,
  )) {
    if (!isDefined(ruleConfig) || ruleConfig.enabled !== true) {
      continue;
    }

    const rule = RECORD_VISIBILITY_RULES[ruleKey as RecordVisibilityRuleKey];

    if (!isDefined(rule)) {
      continue;
    }

    const result = rule.build({
      objectMetadata,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      workspaceMemberId,
      config: ruleConfig,
    });

    if (result.kind === 'denyAll') {
      return { kind: 'denyAll' };
    }

    if (result.kind === 'predicate') {
      predicates.push(result.predicate);
    }
  }

  if (predicates.length === 0) {
    return UNRESTRICTED;
  }

  return {
    kind: 'predicate',
    predicate:
      predicates.length === 1 ? predicates[0] : { kind: 'and', predicates },
  };
};
