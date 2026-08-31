import { type ObjectsPermissions } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type ObjectLiteral } from 'typeorm';

import { isUserAuthContext } from 'src/engine/core-modules/auth/guards/is-user-auth-context.guard';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import {
  TwentyORMException,
  TwentyORMExceptionCode,
} from 'src/engine/twenty-orm/exceptions/twenty-orm.exception';

type ValidateOwnedRecordsRestrictionArgs<T extends ObjectLiteral> = {
  records: T[];
  objectMetadata: FlatObjectMetadata;
  objectRecordsPermissions: ObjectsPermissions;
  authContext: WorkspaceAuthContext;
  shouldBypassPermissionChecks: boolean;
};

// An insert cannot be narrowed by a WHERE clause, so a restricted role is
// instead prevented from creating a record it would not be allowed to read.
export const validateOwnedRecordsRestriction = <T extends ObjectLiteral>({
  records,
  objectMetadata,
  objectRecordsPermissions,
  authContext,
  shouldBypassPermissionChecks,
}: ValidateOwnedRecordsRestrictionArgs<T>): void => {
  if (shouldBypassPermissionChecks) {
    return;
  }

  const ownedRecordsRestriction =
    objectRecordsPermissions[objectMetadata.id]?.ownedRecordsRestriction;

  if (!isDefined(ownedRecordsRestriction)) {
    return;
  }

  if (!isUserAuthContext(authContext)) {
    throw new TwentyORMException(
      'Your current role can only create records it owns, and this ' +
        'request has no workspace member to own them',
      TwentyORMExceptionCode.RLS_VALIDATION_FAILED,
    );
  }

  const workspaceMemberId = authContext.workspaceMember.id;
  const { ownerColumnName } = ownedRecordsRestriction;

  for (const record of records) {
    if (record[ownerColumnName] !== workspaceMemberId) {
      throw new TwentyORMException(
        'Your current role can only create records that you own',
        TwentyORMExceptionCode.RLS_VALIDATION_FAILED,
      );
    }
  }
};
