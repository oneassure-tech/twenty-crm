import { Injectable } from '@nestjs/common';

import {
  FieldMetadataType,
  RecordVisibilityRuleKey,
  RelationType,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { computeMorphOrRelationFieldJoinColumnName } from 'src/engine/metadata-modules/field-metadata/utils/compute-morph-or-relation-field-join-column-name.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { isFlatFieldMetadataOfType } from 'src/engine/metadata-modules/flat-field-metadata/utils/is-flat-field-metadata-of-type.util';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import { OWNER_FIELD_NAME } from 'src/engine/twenty-orm/record-visibility/constants/owner-field-name.constant';
import { resolveRoleIdFromAuthContext } from 'src/engine/twenty-orm/utils/resolve-role-id-from-auth-context.util';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

export type RecordInput = Record<string, unknown>;

// A member restricted to their own records would lose sight of anything they
// create without an owner - and, since writes are restricted too, could not put
// it back. Default the owner to the creator so that cannot happen.
//
// Records created by api keys, applications or workflows are untouched: they
// have no restricted user behind them, so they stay unowned until assigned.
@Injectable()
export class RecordVisibilityOwnerDefaultingService {
  constructor(private readonly workspaceCacheService: WorkspaceCacheService) {}

  async defaultOwnerOnCreate({
    records,
    objectMetadataNameSingular,
    authContext,
  }: {
    records: RecordInput[];
    objectMetadataNameSingular: string;
    authContext: WorkspaceAuthContext;
  }): Promise<RecordInput[]> {
    if (!isUserAuthContext(authContext)) {
      return records;
    }

    const workspaceMemberId = authContext.workspaceMember?.id;

    if (!isDefined(workspaceMemberId)) {
      return records;
    }

    const {
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
      flatRoleMaps,
      userWorkspaceRoleMap,
      apiKeyRoleMap,
    } = await this.workspaceCacheService.getOrRecompute(
      authContext.workspace.id,
      [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
        'flatRoleMaps',
        'userWorkspaceRoleMap',
        'apiKeyRoleMap',
      ],
    );

    const roleId = resolveRoleIdFromAuthContext({
      authContext,
      userWorkspaceRoleMap,
      apiKeyRoleMap,
    });

    if (!isDefined(roleId)) {
      return records;
    }

    const flatRole = findFlatEntityByIdInFlatEntityMaps<FlatRole>({
      flatEntityId: roleId,
      flatEntityMaps: flatRoleMaps,
    });

    if (
      !isDefined(flatRole) ||
      flatRole.universalIdentifier === STANDARD_ROLE.admin.universalIdentifier
    ) {
      return records;
    }

    const isOwnRecordsOnlyEnabled =
      flatRole.recordVisibilitySettings?.[
        RecordVisibilityRuleKey.OWN_RECORDS_ONLY
      ]?.enabled === true;

    if (!isOwnRecordsOnlyEnabled) {
      return records;
    }

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );

    const objectMetadata =
      findFlatEntityByIdInFlatEntityMaps<FlatObjectMetadata>({
        flatEntityId: idByNameSingular[objectMetadataNameSingular],
        flatEntityMaps: flatObjectMetadataMaps,
      });

    if (!isDefined(objectMetadata)) {
      return records;
    }

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
      return records;
    }

    const ownerFlatFieldMetadata = ownerFieldCandidate;

    if (
      ownerFlatFieldMetadata.settings?.relationType !== RelationType.MANY_TO_ONE
    ) {
      return records;
    }

    const ownerJoinColumnName =
      ownerFlatFieldMetadata.settings?.joinColumnName ??
      computeMorphOrRelationFieldJoinColumnName({
        name: ownerFlatFieldMetadata.name,
      });

    return records.map((record) =>
      isDefined(record[ownerJoinColumnName]) ||
      isDefined(record[ownerFlatFieldMetadata.name])
        ? record
        : { ...record, [ownerJoinColumnName]: workspaceMemberId },
    );
  }
}
