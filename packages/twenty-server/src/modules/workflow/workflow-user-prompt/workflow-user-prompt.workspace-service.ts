import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isString } from '@sniptt/guards';
import { isDefined, isValidUuid, resolveInput } from 'twenty-shared/utils';
import {
  getWorkflowRunContext,
  StepStatus,
  USER_PROMPT_OTHER_OPTION_ID,
} from 'twenty-shared/workflow';

import { UpdateRecordService } from 'src/engine/core-modules/record-crud/services/update-record.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import {
  WorkflowRunStatus,
  type WorkflowRunWorkspaceEntity,
} from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { buildWorkflowActorMetadata } from 'src/modules/workflow/workflow-executor/utils/build-workflow-actor-metadata.util';
import { type WorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { isWorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/guards/is-workflow-user-prompt-action.guard';
import { WorkflowRunWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.workspace-service';
import { WorkflowRunnerWorkspaceService } from 'src/modules/workflow/workflow-runner/workspace-services/workflow-runner.workspace-service';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import {
  type PendingUserPrompt,
  type UpdatedRecordInfo,
} from 'src/modules/workflow/workflow-user-prompt/types/pending-user-prompt.type';

@Injectable()
export class WorkflowUserPromptWorkspaceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowRunWorkspaceService: WorkflowRunWorkspaceService,
    private readonly workflowRunnerWorkspaceService: WorkflowRunnerWorkspaceService,
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly updateRecordService: UpdateRecordService,
    private readonly workflowCommonWorkspaceService: WorkflowCommonWorkspaceService,
  ) {}

  async getPendingUserPrompts({
    workspaceId,
    workspaceMemberId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
  }): Promise<PendingUserPrompt[]> {
    const authContext = buildSystemAuthContext(workspaceId);

    const runningWorkflowRuns =
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const workflowRunRepository =
            await this.globalWorkspaceOrmManager.getRepository<WorkflowRunWorkspaceEntity>(
              workspaceId,
              'workflowRun',
              { shouldBypassPermissionChecks: true },
            );

          // Only RUNNING runs can hold a pending step, and a workspace has few
          // of them at a time, so the per-step scan below stays cheap.
          return await workflowRunRepository.find({
            where: { status: WorkflowRunStatus.RUNNING },
            // Oldest first, so a queue of prompts is asked in the order the
            // user created it.
            order: { createdAt: 'ASC' },
          });
        },
        authContext,
      );

    return runningWorkflowRuns.flatMap((workflowRun) => {
      if (
        this.getTargetWorkspaceMemberId(workflowRun) !== workspaceMemberId ||
        !isDefined(workflowRun.state)
      ) {
        return [];
      }

      const steps = workflowRun.state.flow?.steps ?? [];
      const stepInfos = workflowRun.state.stepInfos ?? {};

      return steps.flatMap((step) => {
        if (
          !isWorkflowUserPromptAction(step) ||
          stepInfos[step.id]?.status !== StepStatus.PENDING
        ) {
          return [];
        }

        const { question, options, allowOtherOption, otherOptionLabel } =
          step.settings.input;

        return [
          {
            workflowRunId: workflowRun.id,
            stepId: step.id,
            question,
            options,
            allowOtherOption,
            otherOptionLabel,
          },
        ];
      });
    });
  }

  async submitUserPrompt({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
    selectedOptionId,
    otherValue,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
    selectedOptionId: string;
    otherValue?: string;
  }): Promise<UpdatedRecordInfo> {
    const workflowRun =
      await this.workflowRunWorkspaceService.getWorkflowRunOrFail({
        workflowRunId,
        workspaceId,
      });

    const step = workflowRun.state?.flow?.steps?.find(
      (flowStep) => flowStep.id === stepId,
    );

    if (!isDefined(step)) {
      throw new WorkflowVersionStepException(
        'Step not found',
        WorkflowVersionStepExceptionCode.NOT_FOUND,
      );
    }

    if (!isWorkflowUserPromptAction(step)) {
      throw new WorkflowVersionStepException(
        'Step is not a user prompt',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Step is not an Ask User step`,
        },
      );
    }

    if (
      workflowRun.state?.stepInfos?.[stepId]?.status !== StepStatus.PENDING
    ) {
      throw new WorkflowVersionStepException(
        'Step is not awaiting an answer',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`This question has already been answered`,
        },
      );
    }

    // The prompt is addressed to one person; never take an answer from anyone else.
    if (this.getTargetWorkspaceMemberId(workflowRun) !== workspaceMemberId) {
      throw new WorkflowVersionStepException(
        'User prompt is not addressed to this workspace member',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`This question is not addressed to you`,
        },
      );
    }

    const { answer, isOther } = this.resolveAnswer({
      step,
      selectedOptionId,
      otherValue,
    });

    const updatedRecord = await this.writeAnswerToRecord({
      workspaceId,
      workflowRunId,
      workflowRun,
      step,
      answer,
    });

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfo({
      stepId,
      stepInfo: {
        status: StepStatus.SUCCESS,
        result: { answer, selectedOptionId, isOther },
      },
      workspaceId,
      workflowRunId,
    });

    await this.workflowRunnerWorkspaceService.resume({
      workspaceId,
      workflowRunId,
      lastExecutedStepId: stepId,
    });

    return updatedRecord;
  }

  private resolveAnswer({
    step,
    selectedOptionId,
    otherValue,
  }: {
    step: WorkflowUserPromptAction;
    selectedOptionId: string;
    otherValue?: string;
  }): { answer: string; isOther: boolean } {
    const { options, allowOtherOption } = step.settings.input;

    if (selectedOptionId === USER_PROMPT_OTHER_OPTION_ID) {
      if (!allowOtherOption) {
        throw new WorkflowVersionStepException(
          'This user prompt does not allow a typed answer',
          WorkflowVersionStepExceptionCode.INVALID_REQUEST,
          {
            userFriendlyMessage: msg`This question does not allow a typed answer`,
          },
        );
      }

      const trimmedOtherValue = otherValue?.trim();

      // The prompt has no discard path, so an empty answer must be refused
      // here too and not only in the modal.
      if (!isDefined(trimmedOtherValue) || trimmedOtherValue.length === 0) {
        throw new WorkflowVersionStepException(
          'A typed answer is required',
          WorkflowVersionStepExceptionCode.INVALID_REQUEST,
          {
            userFriendlyMessage: msg`Please type your answer`,
          },
        );
      }

      return { answer: trimmedOtherValue, isOther: true };
    }

    const selectedOption = options.find(
      (option) => option.id === selectedOptionId,
    );

    if (!isDefined(selectedOption)) {
      throw new WorkflowVersionStepException(
        'Selected option does not exist on this user prompt',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Please choose one of the available options`,
        },
      );
    }

    return { answer: selectedOption.label, isOther: false };
  }

  private async writeAnswerToRecord({
    workspaceId,
    workflowRunId,
    workflowRun,
    step,
    answer,
  }: {
    workspaceId: string;
    workflowRunId: string;
    workflowRun: WorkflowRunWorkspaceEntity;
    step: WorkflowUserPromptAction;
    answer: string;
  }): Promise<UpdatedRecordInfo> {
    const context = getWorkflowRunContext(workflowRun.state?.stepInfos ?? {});
    const { objectName, fieldName } = step.settings.input;

    // Only the record id is resolved: resolveInput walks and mutates whatever
    // it is handed, and an option label is the user's text, not a variable.
    const objectRecordId = resolveInput(
      step.settings.input.objectRecordId,
      context,
    );

    if (!isString(objectRecordId) || !isValidUuid(objectRecordId)) {
      throw new WorkflowVersionStepException(
        `Failed to save the answer: "${objectRecordId}" is not a valid record ID`,
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Could not find the record to save this answer to`,
        },
      );
    }

    const executionContext =
      await this.workflowExecutionContextService.getExecutionContext({
        workflowRunId,
        workspaceId,
      });

    const toolOutput = await this.updateRecordService.execute({
      objectName,
      objectRecordId,
      objectRecord: { [fieldName]: answer },
      fieldsToUpdate: [fieldName],
      authContext: executionContext.authContext,
      updatedBy: buildWorkflowActorMetadata(executionContext),
      rolePermissionConfig: executionContext.rolePermissionConfig,
    });

    if (!toolOutput.success) {
      throw new WorkflowVersionStepException(
        `Failed to save the answer: ${toolOutput.error ?? toolOutput.message}`,
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Could not save your answer, please try again`,
        },
      );
    }

    const { flatObjectMetadata } =
      await this.workflowCommonWorkspaceService.getObjectMetadataInfo(
        objectName,
        workspaceId,
      );

    return {
      success: true,
      objectNameSingular: flatObjectMetadata.nameSingular,
      objectNamePlural: flatObjectMetadata.namePlural,
      recordId: objectRecordId,
    };
  }

  // A database-event run carries the acting member in its trigger payload; a
  // manually started run carries it on the run itself.
  private getTargetWorkspaceMemberId(
    workflowRun: WorkflowRunWorkspaceEntity,
  ): string | null {
    const triggerResult = workflowRun.state?.stepInfos?.trigger?.result as
      | { workspaceMemberId?: string }
      | undefined;

    return (
      triggerResult?.workspaceMemberId ??
      workflowRun.createdBy?.workspaceMemberId ??
      null
    );
  }
}
