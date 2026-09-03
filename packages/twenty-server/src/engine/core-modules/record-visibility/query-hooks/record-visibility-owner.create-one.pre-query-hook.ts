import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { STANDARD_ERROR_MESSAGE } from 'src/engine/api/common/common-query-runners/errors/standard-error-message.constant';
import {
  GraphqlQueryRunnerException,
  GraphqlQueryRunnerExceptionCode,
} from 'src/engine/api/graphql/graphql-query-runner/errors/graphql-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import {
  type RecordInput,
  RecordVisibilityOwnerDefaultingService,
} from 'src/engine/core-modules/record-visibility/services/record-visibility-owner-defaulting.service';

@WorkspaceQueryHook(`*.createOne`)
export class RecordVisibilityOwnerCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly recordVisibilityOwnerDefaultingService: RecordVisibilityOwnerDefaultingService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    objectName: string,
    payload: CreateOneResolverArgs<RecordInput>,
  ): Promise<CreateOneResolverArgs<RecordInput>> {
    if (!isDefined(payload.data)) {
      throw new GraphqlQueryRunnerException(
        'Payload data is required',
        GraphqlQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
        { userFriendlyMessage: STANDARD_ERROR_MESSAGE },
      );
    }

    const [recordToCreateData] =
      await this.recordVisibilityOwnerDefaultingService.defaultOwnerOnCreate({
        records: [payload.data],
        objectMetadataNameSingular: objectName,
        authContext,
      });

    return {
      ...payload,
      data: recordToCreateData,
    };
  }
}
