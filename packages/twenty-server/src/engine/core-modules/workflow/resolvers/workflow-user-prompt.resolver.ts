import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { isDefined } from 'twenty-shared/utils';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { PendingUserPromptDTO } from 'src/engine/core-modules/workflow/dtos/pending-user-prompt.dto';
import { SubmitUserPromptResultDTO } from 'src/engine/core-modules/workflow/dtos/submit-user-prompt-result.dto';
import { SubmitUserPromptInput } from 'src/engine/core-modules/workflow/dtos/submit-user-prompt.input';
import { WorkflowVersionStepGraphqlApiExceptionFilter } from 'src/engine/core-modules/workflow/filters/workflow-version-step-graphql-api-exception.filter';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { WorkflowUserPromptWorkspaceService } from 'src/modules/workflow/workflow-user-prompt/workflow-user-prompt.workspace-service';

// Deliberately NOT behind SettingsPermissionGuard(WORKFLOWS), unlike every
// other resolver in this folder. The people who answer these prompts are reps
// doing CRM work, not the admins who build workflows, so they hold no workflow
// permission at all.
//
// This is a narrow exemption, not a hole: the only things it exposes are the
// prompts addressed to the caller personally, and the answer to one of them.
// It grants no read of workflows, versions, runs or views, and the record write
// runs under the workflow application's own role rather than the caller's, so
// answering never lets someone edit a field they could not otherwise edit.
@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@UseFilters(
  PreventNestToAutoLogGraphqlErrorsFilter,
  WorkflowVersionStepGraphqlApiExceptionFilter,
)
export class WorkflowUserPromptResolver {
  constructor(
    private readonly workflowUserPromptWorkspaceService: WorkflowUserPromptWorkspaceService,
  ) {}

  @Query(() => [PendingUserPromptDTO])
  async pendingUserPrompts(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
  ): Promise<PendingUserPromptDTO[]> {
    if (!isDefined(workspaceMemberId)) {
      return [];
    }

    return this.workflowUserPromptWorkspaceService.getPendingUserPrompts({
      workspaceId,
      workspaceMemberId,
    });
  }

  @Mutation(() => SubmitUserPromptResultDTO)
  async submitUserPrompt(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string | undefined,
    @Args('input')
    {
      workflowRunId,
      stepId,
      selectedOptionId,
      otherValue,
    }: SubmitUserPromptInput,
  ): Promise<SubmitUserPromptResultDTO> {
    if (!isDefined(workspaceMemberId)) {
      throw new WorkflowVersionStepException(
        'Only a workspace member can answer a user prompt',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
      );
    }

    // Returns the record that changed so the client can refresh it in place,
    // instead of the user reloading to see the answer they just saved.
    return this.workflowUserPromptWorkspaceService.submitUserPrompt({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
      selectedOptionId,
      otherValue,
    });
  }
}
