import { type ObjectsPermissions } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';

import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { getOwnerJoinColumnName } from 'src/engine/twenty-orm/utils/get-owner-join-column-name.util';

const OWNED_RECORDS_RESTRICTION_PARAMETER = '__ownedRecordsRestrictionMemberId';

/**
 * Narrows a query to records owned by the caller when their role carries
 * `restrictToOwnedRecords`. Applied at the query builder so it holds for every
 * read path - list views, search, REST, GraphQL and nested relations alike -
 * rather than being a filter the client could drop.
 */
export const applyOwnedRecordsRestriction = <T extends ObjectLiteral>({
  queryBuilder,
  objectMetadataId,
  objectsPermissions,
  authContext,
}: {
  queryBuilder: SelectQueryBuilder<T>;
  objectMetadataId: string;
  objectsPermissions: ObjectsPermissions;
  authContext: WorkspaceAuthContext;
}): void => {
  if (objectsPermissions[objectMetadataId]?.restrictToOwnedRecords !== true) {
    return;
  }

  const mainAlias = queryBuilder.expressionMap.mainAlias;

  if (!isDefined(mainAlias) || !mainAlias.hasMetadata) {
    return;
  }

  const ownerJoinColumnName = getOwnerJoinColumnName(mainAlias.metadata);

  if (!isDefined(ownerJoinColumnName)) {
    return;
  }

  const workspaceMemberId = isUserAuthContext(authContext)
    ? authContext.workspaceMemberId
    : undefined;

  // Fail closed. A caller with no workspace member - an API key or an
  // application - owns no record, so a restricted role grants it nothing.
  if (!isDefined(workspaceMemberId)) {
    queryBuilder.andWhere('1 = 0');

    return;
  }

  queryBuilder.andWhere(
    `"${mainAlias.name}"."${ownerJoinColumnName}" = :${OWNED_RECORDS_RESTRICTION_PARAMETER}`,
    { [OWNED_RECORDS_RESTRICTION_PARAMETER]: workspaceMemberId },
  );
};
