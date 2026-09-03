import { type ObjectLiteral } from 'typeorm';

import { GraphqlQueryFilterFieldParser } from 'src/engine/api/graphql/graphql-query-runner/graphql-query-parsers/graphql-query-filter/graphql-query-filter-field.parser';
import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { type WorkspaceInternalContext } from 'src/engine/twenty-orm/interfaces/workspace-internal-context.interface';
import { applyRecordVisibilityPredicateToQueryBuilder } from 'src/engine/twenty-orm/record-visibility/utils/apply-record-visibility-predicate-to-query-builder.util';
import { resolveRecordVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/utils/resolve-record-visibility-predicate.util';
import { type WorkspaceSelectQueryBuilder } from 'src/engine/twenty-orm/repository/workspace-select-query-builder';
import { resolveRoleIdFromAuthContext } from 'src/engine/twenty-orm/utils/resolve-role-id-from-auth-context.util';

export const applyRecordVisibilityRules = <T extends ObjectLiteral>({
  queryBuilder,
  objectMetadata,
  internalContext,
  authContext,
}: {
  queryBuilder: WorkspaceSelectQueryBuilder<T>;
  objectMetadata: FlatObjectMetadata;
  internalContext: WorkspaceInternalContext;
  authContext: WorkspaceAuthContext;
}): void => {
  const resolved = resolveRecordVisibilityPredicate({
    roleId: resolveRoleIdFromAuthContext({
      authContext,
      userWorkspaceRoleMap: internalContext.userWorkspaceRoleMap,
      apiKeyRoleMap: internalContext.apiKeyRoleMap,
    }),
    flatRoleMaps: internalContext.flatRoleMaps,
    objectMetadata,
    flatObjectMetadataMaps: internalContext.flatObjectMetadataMaps,
    flatFieldMetadataMaps: internalContext.flatFieldMetadataMaps,
    workspaceMemberId: isUserAuthContext(authContext)
      ? authContext.workspaceMember?.id
      : undefined,
  });

  if (resolved.kind === 'unrestricted') {
    return;
  }

  if (resolved.kind === 'denyAll') {
    queryBuilder.andWhere('1 = 0');

    return;
  }

  // UPDATE / DELETE / SOFT-DELETE statements carry no join alias, so their
  // conditions must reference the column directly.
  const useDirectTableReference =
    queryBuilder.expressionMap.queryType === 'update' ||
    queryBuilder.expressionMap.queryType === 'soft-delete' ||
    queryBuilder.expressionMap.queryType === 'delete';

  applyRecordVisibilityPredicateToQueryBuilder({
    queryBuilder,
    objectNameSingular: objectMetadata.nameSingular,
    predicate: resolved.predicate,
    fieldParser: new GraphqlQueryFilterFieldParser(
      objectMetadata,
      internalContext.flatFieldMetadataMaps,
      internalContext.flatObjectMetadataMaps,
    ),
    useDirectTableReference,
  });
};
