import {
  FieldMetadataType,
  RecordVisibilityRuleKey,
  RelationType,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { OWNER_FIELD_NAME } from 'src/engine/twenty-orm/record-visibility/constants/owner-field-name.constant';
import {
  type RecordVisibilityRule,
  type RecordVisibilityRuleContext,
  type RecordVisibilityRuleResult,
} from 'src/engine/twenty-orm/record-visibility/types/record-visibility-rule.type';

const WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR = 'workspaceMember';

// Restricts a role to records it owns. Applies to any object - standard or
// custom, existing or created later - carrying an `owner` relation to
// workspaceMember. Objects without one are left untouched.
export const ownRecordsOnlyRule: RecordVisibilityRule = {
  key: RecordVisibilityRuleKey.OWN_RECORDS_ONLY,
  build: ({
    objectMetadata,
    flatObjectMetadataMaps,
    flatFieldMetadataMaps,
    workspaceMemberId,
  }: RecordVisibilityRuleContext): RecordVisibilityRuleResult => {
    const ownerFieldCandidate = getFlatFieldsFromFlatObjectMetadata(
      objectMetadata,
      flatFieldMetadataMaps,
    ).find((flatFieldMetadata) => flatFieldMetadata.name === OWNER_FIELD_NAME);

    if (
      !isDefined(ownerFieldCandidate) ||
      !isFlatFieldMetadataOfType(
        ownerFieldCandidate,
        FieldMetadataType.RELATION,
      )
    ) {
      return { kind: 'unrestricted' };
    }

    const ownerFlatFieldMetadata = ownerFieldCandidate;

    if (
      ownerFlatFieldMetadata.settings?.relationType !==
        RelationType.MANY_TO_ONE ||
      !isDefined(ownerFlatFieldMetadata.relationTargetObjectMetadataId)
    ) {
      return { kind: 'unrestricted' };
    }

    const targetFlatObjectMetadata =
      findFlatEntityByIdInFlatEntityMaps<FlatObjectMetadata>({
        flatEntityId: ownerFlatFieldMetadata.relationTargetObjectMetadataId,
        flatEntityMaps: flatObjectMetadataMaps,
      });

    if (
      targetFlatObjectMetadata?.nameSingular !==
      WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR
    ) {
      return { kind: 'unrestricted' };
    }

    // The rule applies but there is no workspace member to compare against
    // (api key, application or system principal). Fail closed rather than
    // letting the restriction silently disappear.
    if (!isDefined(workspaceMemberId)) {
      return { kind: 'denyAll' };
    }

    return {
      kind: 'predicate',
      predicate: {
        kind: 'field',
        fieldName: ownerFlatFieldMetadata.name,
        columnName:
          ownerFlatFieldMetadata.settings?.joinColumnName ??
          computeMorphOrRelationFieldJoinColumnName({
            name: ownerFlatFieldMetadata.name,
          }),
        comparison: { operator: 'equals', value: workspaceMemberId },
      },
    };
  },
};
