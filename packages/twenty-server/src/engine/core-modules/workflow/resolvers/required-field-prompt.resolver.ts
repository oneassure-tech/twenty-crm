import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { CoreResolver } from 'src/engine/api/graphql/graphql-config/decorators/core-resolver.decorator';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { DiscardRequiredFieldInput } from 'src/engine/core-modules/workflow/dtos/discard-required-field.input';
import { PendingRequiredFieldDTO } from 'src/engine/core-modules/workflow/dtos/pending-required-field.dto';
import { SubmitRequiredFieldInput } from 'src/engine/core-modules/workflow/dtos/submit-required-field.input';
import { WorkflowVersionStepGraphqlApiExceptionFilter } from 'src/engine/core-modules/workflow/filters/workflow-version-step-graphql-api-exception.filter';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { RequiredFieldPromptWorkspaceService } from 'src/modules/workflow/workflow-runner/required-field-prompt/required-field-prompt.workspace-service';

// Intentionally NOT behind SettingsPermissionGuard(WORKFLOWS), unlike every
// other workflow resolver. Answering a required field is data entry that any
// member may be asked to do, and gating it on workflow-administration rights
// meant only admins could ever complete a prompt.
//
// Authorisation is by ownership instead: the service proves the caller is the
// person the prompt was raised for before returning or changing anything.
@CoreResolver()
@UsePipes(ResolverValidationPipe)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
@UseFilters(
  PreventNestToAutoLogGraphqlErrorsFilter,
  WorkflowVersionStepGraphqlApiExceptionFilter,
)
export class RequiredFieldPromptResolver {
  constructor(
    private readonly requiredFieldPromptWorkspaceService: RequiredFieldPromptWorkspaceService,
  ) {}

  @Query(() => [PendingRequiredFieldDTO])
  async findMyPendingRequiredFields(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<PendingRequiredFieldDTO[]> {
    return this.requiredFieldPromptWorkspaceService.findMyPendingRequiredFields(
      { workspaceId, workspaceMemberId },
    );
  }

  @Mutation(() => Boolean)
  async submitMyRequiredField(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('input') { workflowRunId, stepId, value }: SubmitRequiredFieldInput,
  ): Promise<boolean> {
    return this.requiredFieldPromptWorkspaceService.submitMyRequiredField({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
      value,
    });
  }

  @Mutation(() => Boolean)
  async discardMyRequiredField(
    @AuthWorkspace() { id: workspaceId }: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
    @Args('input') { workflowRunId, stepId }: DiscardRequiredFieldInput,
  ): Promise<boolean> {
    return this.requiredFieldPromptWorkspaceService.discardMyRequiredField({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });
  }
}
