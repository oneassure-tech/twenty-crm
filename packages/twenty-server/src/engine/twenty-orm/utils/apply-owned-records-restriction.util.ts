import { randomBytes } from 'crypto';

import { type ObjectsPermissions } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type ObjectLiteral } from 'typeorm';

import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type WorkspaceSelectQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-select-query-builder';

type ApplyOwnedRecordsRestrictionArgs<T extends ObjectLiteral> = {
  queryBuilder: WorkspaceSelectQueryBuilder<T>;
  objectMetadata: FlatObjectMetadata;
  objectRecordsPermissions: ObjectsPermissions;
  authContext: WorkspaceAuthContext;
  shouldBypassPermissionChecks: boolean;
};

// Narrows a query to the records the current workspace member owns.
//
// The owner column is a plain foreign key on the object's own table, resolved
// once per workspace cache build, so this is a single equality check with no
// join. Records with a null owner are excluded by SQL equality semantics.
export const applyOwnedRecordsRestriction = <T extends ObjectLiteral>({
  queryBuilder,
  objectMetadata,
  objectRecordsPermissions,
  authContext,
  shouldBypassPermissionChecks,
}: ApplyOwnedRecordsRestrictionArgs<T>): void => {
  if (shouldBypassPermissionChecks) {
    return;
  }

  const ownedRecordsRestriction =
    objectRecordsPermissions[objectMetadata.id]?.ownedRecordsRestriction;

  if (!isDefined(ownedRecordsRestriction)) {
    return;
  }

  const isUpdateOrDeleteQuery =
    queryBuilder.expressionMap.queryType === 'update' ||
    queryBuilder.expressionMap.queryType === 'soft-delete' ||
    queryBuilder.expressionMap.queryType === 'delete';

  const { ownerColumnName } = ownedRecordsRestriction;

  const fieldReference = isUpdateOrDeleteQuery
    ? `"${ownerColumnName}"`
    : `"${objectMetadata.nameSingular}"."${ownerColumnName}"`;

  // A non-user principal (API key, application) has no workspace member to
  // compare against, so a restricted role resolves to no records rather than
  // silently falling through to every record.
  if (!isUserAuthContext(authContext)) {
    queryBuilder.andWhere('1 = 0');

    return;
  }

  const paramSuffix = randomBytes(5).toString('hex');
  const paramName = `ownedRecordsWorkspaceMemberId_${paramSuffix}`;

  queryBuilder.andWhere(`${fieldReference} = :${paramName}`, {
    [paramName]: authContext.workspaceMember.id,
  });
};
