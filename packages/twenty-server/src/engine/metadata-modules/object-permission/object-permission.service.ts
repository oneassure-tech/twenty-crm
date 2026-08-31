import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import {
  CoreObjectNameSingular,
  FieldMetadataType,
  RelationType,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { type AllFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/all-flat-entity-maps.type';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatObjectPermission } from 'src/engine/metadata-modules/flat-object-permission/types/flat-object-permission.type';
import { fromCreateObjectPermissionInputToUniversalFlatObjectPermission } from 'src/engine/metadata-modules/flat-object-permission/utils/from-create-object-permission-input-to-universal-flat-object-permission.util';
import { type FlatRole } from 'src/engine/metadata-modules/flat-role/types/flat-role.type';
import {
  type ObjectPermissionInput,
  type UpsertObjectPermissionsInput,
} from 'src/engine/metadata-modules/object-permission/dtos/upsert-object-permissions.input';
import {
  PermissionsException,
  PermissionsExceptionCode,
  PermissionsExceptionMessage,
} from 'src/engine/metadata-modules/permissions/permissions.exception';
import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { type UniversalFlatObjectPermission } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-object-permission.type';

@Injectable()
export class ObjectPermissionService {
  constructor(
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly applicationService: ApplicationService,
  ) {}

  public async upsertObjectPermissions({
    workspaceId,
    input,
  }: {
    workspaceId: string;
    input: UpsertObjectPermissionsInput;
  }): Promise<FlatObjectPermission[]> {
    const {
      flatObjectPermissionMaps,
      flatRoleMaps,
      flatObjectMetadataMaps,
      flatFieldMetadataMaps,
    } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: [
            'flatObjectPermissionMaps',
            'flatRoleMaps',
            'flatObjectMetadataMaps',
            'flatFieldMetadataMaps',
          ],
        },
      );

    const roleUniversalIdentifier =
      flatRoleMaps.universalIdentifierById[input.roleId];
    const flatRole = isDefined(roleUniversalIdentifier)
      ? flatRoleMaps.byUniversalIdentifier[roleUniversalIdentifier]
      : undefined;

    if (!isDefined(flatRole)) {
      throw new PermissionsException(
        PermissionsExceptionMessage.ROLE_NOT_FOUND,
        PermissionsExceptionCode.ROLE_NOT_FOUND,
        {
          userFriendlyMessage: msg`The role you are trying to modify could not be found.`,
        },
      );
    }

    const currentObjectPermissionsForRole = Object.values(
      flatObjectPermissionMaps.byUniversalIdentifier,
    ).filter(
      (op): op is FlatObjectPermission =>
        isDefined(op) && op.roleUniversalIdentifier === roleUniversalIdentifier,
    );

    this.validateObjectPermissionsReadAndWriteConsistencyOrThrow({
      objectPermissions: input.objectPermissions,
      flatRole,
      currentObjectPermissionsForRole,
    });

    const flatApplication =
      await this.getFlatApplicationForWorkspace(workspaceId);

    const desiredByObjectMetadataId = new Map(
      input.objectPermissions.map((op) => [op.objectMetadataId, op]),
    );

    for (const desired of input.objectPermissions) {
      const objectMetadata = findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: desired.objectMetadataId,
        flatEntityMaps: flatObjectMetadataMaps,
      });

      if (!isDefined(objectMetadata)) {
        throw new PermissionsException(
          'Object metadata id not found',
          PermissionsExceptionCode.OBJECT_METADATA_NOT_FOUND,
          {
            userFriendlyMessage: msg`The object you are trying to set permissions for could not be found. It may have been deleted.`,
          },
        );
      }

      if (objectMetadata.isSystem === true) {
        throw new PermissionsException(
          PermissionsExceptionMessage.CANNOT_ADD_OBJECT_PERMISSION_ON_SYSTEM_OBJECT,
          PermissionsExceptionCode.CANNOT_ADD_OBJECT_PERMISSION_ON_SYSTEM_OBJECT,
          {
            userFriendlyMessage: msg`You cannot set permissions on system objects as they are managed by the platform.`,
          },
        );
      }

      if (isDefined(desired.ownerFieldMetadataId)) {
        this.validateOwnerFieldMetadataOrThrow({
          ownerFieldMetadataId: desired.ownerFieldMetadataId,
          objectMetadataId: desired.objectMetadataId,
          flatFieldMetadataMaps,
          flatObjectMetadataMaps,
        });
      }
    }

    const flatEntityToCreate: (UniversalFlatObjectPermission & {
      id: string;
    })[] = [];
    const flatEntityToUpdate: UniversalFlatObjectPermission[] = [];
    const flatEntityToDelete: UniversalFlatObjectPermission[] = [];

    const currentByObjectMetadataId = new Map(
      currentObjectPermissionsForRole.map((op) => [op.objectMetadataId, op]),
    );

    for (const desired of input.objectPermissions) {
      const current = currentByObjectMetadataId.get(desired.objectMetadataId);

      if (!isDefined(current)) {
        flatEntityToCreate.push(
          fromCreateObjectPermissionInputToUniversalFlatObjectPermission({
            createObjectPermissionInput: {
              roleId: input.roleId,
              objectMetadataId: desired.objectMetadataId,
              canReadObjectRecords: desired.canReadObjectRecords,
              canUpdateObjectRecords: desired.canUpdateObjectRecords,
              canSoftDeleteObjectRecords: desired.canSoftDeleteObjectRecords,
              canDestroyObjectRecords: desired.canDestroyObjectRecords,
              ownerFieldMetadataId: desired.ownerFieldMetadataId,
            },
            flatApplication,
            flatRoleMaps,
            flatObjectMetadataMaps,
          }),
        );
      } else {
        const effectiveCanRead =
          desired.canReadObjectRecords !== undefined
            ? desired.canReadObjectRecords
            : current.canReadObjectRecords;
        const effectiveCanUpdate =
          desired.canUpdateObjectRecords !== undefined
            ? desired.canUpdateObjectRecords
            : current.canUpdateObjectRecords;
        const effectiveCanSoftDelete =
          desired.canSoftDeleteObjectRecords !== undefined
            ? desired.canSoftDeleteObjectRecords
            : current.canSoftDeleteObjectRecords;
        const effectiveCanDestroy =
          desired.canDestroyObjectRecords !== undefined
            ? desired.canDestroyObjectRecords
            : current.canDestroyObjectRecords;

        const effectiveOwnerFieldMetadataId =
          desired.ownerFieldMetadataId !== undefined
            ? desired.ownerFieldMetadataId
            : current.ownerFieldMetadataId;

        const canChanged =
          effectiveOwnerFieldMetadataId !== current.ownerFieldMetadataId ||
          effectiveCanRead !== current.canReadObjectRecords ||
          effectiveCanUpdate !== current.canUpdateObjectRecords ||
          effectiveCanSoftDelete !== current.canSoftDeleteObjectRecords ||
          effectiveCanDestroy !== current.canDestroyObjectRecords;

        if (canChanged) {
          const now = new Date().toISOString();
          flatEntityToUpdate.push({
            universalIdentifier: current.universalIdentifier,
            applicationUniversalIdentifier:
              current.applicationUniversalIdentifier,
            roleUniversalIdentifier: current.roleUniversalIdentifier,
            objectMetadataUniversalIdentifier:
              current.objectMetadataUniversalIdentifier,
            canReadObjectRecords: effectiveCanRead,
            canUpdateObjectRecords: effectiveCanUpdate,
            canSoftDeleteObjectRecords: effectiveCanSoftDelete,
            canDestroyObjectRecords: effectiveCanDestroy,
            ownerFieldMetadataId: effectiveOwnerFieldMetadataId,
            createdAt: current.createdAt,
            updatedAt: now,
          });
        }
      }
    }

    for (const current of currentObjectPermissionsForRole) {
      if (!desiredByObjectMetadataId.has(current.objectMetadataId)) {
        flatEntityToDelete.push({
          universalIdentifier: current.universalIdentifier,
          applicationUniversalIdentifier:
            current.applicationUniversalIdentifier,
          roleUniversalIdentifier: current.roleUniversalIdentifier,
          objectMetadataUniversalIdentifier:
            current.objectMetadataUniversalIdentifier,
          canReadObjectRecords: current.canReadObjectRecords,
          canUpdateObjectRecords: current.canUpdateObjectRecords,
          canSoftDeleteObjectRecords: current.canSoftDeleteObjectRecords,
          canDestroyObjectRecords: current.canDestroyObjectRecords,
          ownerFieldMetadataId: current.ownerFieldMetadataId,
          createdAt: current.createdAt,
          updatedAt: current.updatedAt,
        });
      }
    }

    if (
      flatEntityToCreate.length === 0 &&
      flatEntityToUpdate.length === 0 &&
      flatEntityToDelete.length === 0
    ) {
      const unchanged = currentObjectPermissionsForRole.filter((op) =>
        desiredByObjectMetadataId.has(op.objectMetadataId),
      );
      return unchanged;
    }

    const buildAndRunResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            objectPermission: {
              flatEntityToCreate,
              flatEntityToUpdate,
              flatEntityToDelete,
            },
          },
          workspaceId,
          isSystemBuild: false,
          applicationUniversalIdentifier: flatApplication.universalIdentifier,
        },
      );

    if (buildAndRunResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        buildAndRunResult,
        'Validation errors occurred while upserting object permissions',
      );
    }

    const { flatObjectPermissionMaps: freshFlatObjectPermissionMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectPermissionMaps'],
        },
      );

    const resultObjectPermissions = Object.values(
      freshFlatObjectPermissionMaps.byUniversalIdentifier,
    ).filter(
      (op): op is FlatObjectPermission =>
        isDefined(op) && op.roleUniversalIdentifier === roleUniversalIdentifier,
    );

    const desiredObjectMetadataIds = new Set(
      input.objectPermissions.map((op) => op.objectMetadataId),
    );
    const filtered = resultObjectPermissions.filter((op) =>
      desiredObjectMetadataIds.has(op.objectMetadataId),
    );

    return filtered;
  }

  // An owner field must be a MANY_TO_ONE relation to workspaceMember on this
  // very object, otherwise it cannot be compared to the current member.
  private validateOwnerFieldMetadataOrThrow({
    ownerFieldMetadataId,
    objectMetadataId,
    flatFieldMetadataMaps,
    flatObjectMetadataMaps,
  }: {
    ownerFieldMetadataId: string;
    objectMetadataId: string;
  } & Pick<
    AllFlatEntityMaps,
    'flatFieldMetadataMaps' | 'flatObjectMetadataMaps'
  >): void {
    const ownerFieldMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: ownerFieldMetadataId,
      flatEntityMaps: flatFieldMetadataMaps,
    });

    if (!isDefined(ownerFieldMetadata)) {
      throw new PermissionsException(
        PermissionsExceptionMessage.FIELD_METADATA_NOT_FOUND,
        PermissionsExceptionCode.FIELD_METADATA_NOT_FOUND,
        {
          userFriendlyMessage: msg`The owner field you selected could not be found. It may have been deleted.`,
        },
      );
    }

    const workspaceMemberObjectMetadataId = Object.values(
      flatObjectMetadataMaps.byUniversalIdentifier,
    ).find(
      (flatObjectMetadata) =>
        flatObjectMetadata?.nameSingular ===
        CoreObjectNameSingular.WorkspaceMember,
    )?.id;

    const isValidOwnerField =
      ownerFieldMetadata.objectMetadataId === objectMetadataId &&
      ownerFieldMetadata.type === FieldMetadataType.RELATION &&
      ownerFieldMetadata.settings?.relationType === RelationType.MANY_TO_ONE &&
      isDefined(workspaceMemberObjectMetadataId) &&
      ownerFieldMetadata.relationTargetObjectMetadataId ===
        workspaceMemberObjectMetadataId;

    if (!isValidOwnerField) {
      throw new PermissionsException(
        'Owner field must be a many-to-one relation to workspace member on this object',
        PermissionsExceptionCode.INVALID_ARG,
        {
          userFriendlyMessage: msg`The owner field must be a relation pointing to a workspace member on this object.`,
        },
      );
    }
  }

  private validateObjectPermissionsReadAndWriteConsistencyOrThrow({
    objectPermissions: newObjectPermissions,
    flatRole,
    currentObjectPermissionsForRole,
  }: {
    objectPermissions: ObjectPermissionInput[];
    flatRole: Pick<
      FlatRole,
      | 'canReadAllObjectRecords'
      | 'canUpdateAllObjectRecords'
      | 'canSoftDeleteAllObjectRecords'
      | 'canDestroyAllObjectRecords'
    >;
    currentObjectPermissionsForRole: FlatObjectPermission[];
  }): void {
    for (const newObjectPermission of newObjectPermissions) {
      const existingObjectRecordPermission =
        currentObjectPermissionsForRole.find(
          (objectPermission) =>
            objectPermission.objectMetadataId ===
            newObjectPermission.objectMetadataId,
        );

      const resolvedCanRead =
        newObjectPermission.canReadObjectRecords !== undefined
          ? newObjectPermission.canReadObjectRecords
          : existingObjectRecordPermission?.canReadObjectRecords;
      const hasReadPermissionAfterUpdate =
        resolvedCanRead ?? flatRole.canReadAllObjectRecords;

      if (hasReadPermissionAfterUpdate === false) {
        const resolvedCanUpdate =
          newObjectPermission.canUpdateObjectRecords !== undefined
            ? newObjectPermission.canUpdateObjectRecords
            : existingObjectRecordPermission?.canUpdateObjectRecords;
        const hasUpdatePermissionAfterUpdate =
          resolvedCanUpdate ?? flatRole.canUpdateAllObjectRecords;

        const resolvedCanSoftDelete =
          newObjectPermission.canSoftDeleteObjectRecords !== undefined
            ? newObjectPermission.canSoftDeleteObjectRecords
            : existingObjectRecordPermission?.canSoftDeleteObjectRecords;
        const hasSoftDeletePermissionAfterUpdate =
          resolvedCanSoftDelete ?? flatRole.canSoftDeleteAllObjectRecords;

        const resolvedCanDestroy =
          newObjectPermission.canDestroyObjectRecords !== undefined
            ? newObjectPermission.canDestroyObjectRecords
            : existingObjectRecordPermission?.canDestroyObjectRecords;
        const hasDestroyPermissionAfterUpdate =
          resolvedCanDestroy ?? flatRole.canDestroyAllObjectRecords;

        if (
          hasUpdatePermissionAfterUpdate ||
          hasSoftDeletePermissionAfterUpdate ||
          hasDestroyPermissionAfterUpdate
        ) {
          throw new PermissionsException(
            PermissionsExceptionMessage.CANNOT_GIVE_WRITING_PERMISSION_ON_NON_READABLE_OBJECT,
            PermissionsExceptionCode.CANNOT_GIVE_WRITING_PERMISSION_ON_NON_READABLE_OBJECT,
            {
              userFriendlyMessage: msg`You cannot grant edit permissions without also granting read permissions. Please enable read access first.`,
            },
          );
        }
      }
    }
  }

  private async getFlatApplicationForWorkspace(workspaceId: string) {
    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );
    return workspaceCustomFlatApplication;
  }
}
