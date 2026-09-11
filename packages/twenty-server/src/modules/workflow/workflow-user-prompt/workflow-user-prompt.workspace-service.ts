import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { type FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { StepStatus, WorkflowActionType } from 'twenty-shared/workflow';

import { getFlatFieldsFromFlatObjectMetadata } from 'src/engine/api/graphql/workspace-schema-builder/utils/get-flat-fields-for-flat-object-metadata.util';
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
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { isWorkflowUserFormAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/guards/is-workflow-user-form-action.guard';
import { isWorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/guards/is-workflow-user-prompt-action.guard';
import { WorkflowRunWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.workspace-service';
import { WorkflowRunnerWorkspaceService } from 'src/modules/workflow/workflow-runner/workspace-services/workflow-runner.workspace-service';
import { WorkflowUserPromptAnswerWriterWorkspaceService } from 'src/modules/workflow/workflow-user-prompt/workflow-user-prompt-answer-writer.workspace-service';
import { resolveUserFormAnswers } from 'src/modules/workflow/workflow-user-prompt/utils/resolve-user-form-answers.util';
import { resolveUserPromptAnswer } from 'src/modules/workflow/workflow-user-prompt/utils/resolve-user-prompt-answer.util';
import {
  type PendingUserPrompt,
  type SkippedUserPromptInfo,
  type UpdatedRecordFieldsInfo,
  type UpdatedRecordInfo,
} from 'src/modules/workflow/workflow-user-prompt/types/pending-user-prompt.type';

@Injectable()
export class WorkflowUserPromptWorkspaceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowRunWorkspaceService: WorkflowRunWorkspaceService,
    private readonly workflowRunnerWorkspaceService: WorkflowRunnerWorkspaceService,
    private readonly workflowUserPromptAnswerWriterWorkspaceService: WorkflowUserPromptAnswerWriterWorkspaceService,
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

      return steps.flatMap((step): PendingUserPrompt[] => {
        if (stepInfos[step.id]?.status !== StepStatus.PENDING) {
          return [];
        }

        if (isWorkflowUserPromptAction(step)) {
          const { question, options, allowOtherOption, otherOptionLabel } =
            step.settings.input;

          return [
            {
              workflowRunId: workflowRun.id,
              stepId: step.id,
              kind: WorkflowActionType.USER_PROMPT as const,
              question,
              options,
              allowOtherOption,
              otherOptionLabel,
              objectNameSingular: step.settings.input.objectName,
              questions: [],
            },
          ];
        }

        if (isWorkflowUserFormAction(step)) {
          const { questions, objectName } = step.settings.input;

          return [
            {
              workflowRunId: workflowRun.id,
              stepId: step.id,
              kind: WorkflowActionType.USER_FORM as const,
              // The form carries its questions one level down, so the shared
              // single-question fields stay empty for this kind.
              question: '',
              options: [],
              allowOtherOption: false,
              otherOptionLabel: '',
              objectNameSingular: objectName,
              questions,
            },
          ];
        }

        return [];
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
    const { workflowRun, step } = await this.getPendingStepOrFail({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });

    if (!isWorkflowUserPromptAction(step)) {
      throw new WorkflowVersionStepException(
        'Step is not a user prompt',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Step is not an Ask User step`,
        },
      );
    }

    const { answer, isOther } = resolveUserPromptAnswer({
      step,
      selectedOptionId,
      otherValue,
    });

    const updatedRecord =
      await this.workflowUserPromptAnswerWriterWorkspaceService.writePromptAnswer(
        {
          workspaceId,
          workflowRunId,
          workflowRun,
          step,
          answer,
        },
      );

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

  async submitUserForm({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
    answers,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
    answers: Record<string, unknown>;
  }): Promise<UpdatedRecordFieldsInfo> {
    const { workflowRun, step } = await this.getPendingStepOrFail({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });

    if (!isWorkflowUserFormAction(step)) {
      throw new WorkflowVersionStepException(
        'Step is not a user form',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Step is not an Ask User Form step`,
        },
      );
    }

    const fieldTypeByFieldName = await this.getFieldTypeByFieldName({
      objectName: step.settings.input.objectName,
      workspaceId,
    });

    const answersToWrite = resolveUserFormAnswers({
      step,
      answers,
      fieldTypeByFieldName,
    });

    const updatedRecord =
      await this.workflowUserPromptAnswerWriterWorkspaceService.writeFormAnswers(
        {
          workspaceId,
          workflowRunId,
          workflowRun,
          step,
          answers: answersToWrite,
        },
      );

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfo({
      stepId,
      stepInfo: {
        status: StepStatus.SUCCESS,
        result: answersToWrite,
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

  // Closing the modal is a real answer to give: the person declines to fill it
  // in. The step is skipped rather than answered, which lets the executor walk
  // forward and skip whatever depended on it, so the run ends instead of
  // parking on a question nobody can answer.
  async skipUserPrompt({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
  }): Promise<SkippedUserPromptInfo> {
    const { step } = await this.getPendingStepOrFail({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });

    if (!isWorkflowUserPromptAction(step) && !isWorkflowUserFormAction(step)) {
      throw new WorkflowVersionStepException(
        'Step is not a user prompt or a user form',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`This step cannot be closed`,
        },
      );
    }

    await this.workflowRunWorkspaceService.updateWorkflowRunStepInfo({
      stepId,
      stepInfo: {
        status: StepStatus.SKIPPED,
      },
      workspaceId,
      workflowRunId,
    });

    await this.workflowRunnerWorkspaceService.resume({
      workspaceId,
      workflowRunId,
      lastExecutedStepId: stepId,
    });

    return { success: true };
  }

  private async getPendingStepOrFail({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
  }): Promise<{
    workflowRun: WorkflowRunWorkspaceEntity;
    step: WorkflowAction;
  }> {
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

    if (workflowRun.state?.stepInfos?.[stepId]?.status !== StepStatus.PENDING) {
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

    return { workflowRun, step };
  }

  // Whether an answer is blank depends on the field it lands in - a cleared
  // link is an object, not an empty string - so validation needs the types.
  private async getFieldTypeByFieldName({
    objectName,
    workspaceId,
  }: {
    objectName: string;
    workspaceId: string;
  }): Promise<Record<string, FieldMetadataType>> {
    const { flatObjectMetadata, flatFieldMetadataMaps } =
      await this.workflowCommonWorkspaceService.getObjectMetadataInfo(
        objectName,
        workspaceId,
      );

    return Object.fromEntries(
      getFlatFieldsFromFlatObjectMetadata(
        flatObjectMetadata,
        flatFieldMetadataMaps,
      ).map((flatFieldMetadata) => [
        flatFieldMetadata.name,
        flatFieldMetadata.type,
      ]),
    );
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
