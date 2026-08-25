import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { hasRequireFieldAnswer, StepStatus } from 'twenty-shared/workflow';

import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import {
  type WorkflowRunWorkspaceEntity,
  WorkflowRunStatus,
} from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { isWorkflowRequireFieldAction } from 'src/modules/workflow/workflow-executor/workflow-actions/require-field/guards/is-workflow-require-field-action.guard';
import { type WorkflowRequireFieldAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { WorkflowRunWorkspaceService } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.workspace-service';
import { WorkflowRunnerWorkspaceService } from 'src/modules/workflow/workflow-runner/workspace-services/workflow-runner.workspace-service';

export type PendingRequiredField = {
  workflowRunId: string;
  stepId: string;
  label: string;
  placeholder: string | null;
  type: string;
  fieldMetadataId: string;
  objectNameSingular: string;
  fieldName: string;
  recordId: string | null;
};

// Reading a workflow run normally needs the WORKFLOWS settings permission,
// which ordinary members do not have. Answering a required field is data entry,
// not workflow administration, so this service deliberately reads with a system
// context and authorises by ownership instead: you may only see and act on a
// prompt that is addressed to you. It never exposes anything else about the
// run, and grants no ability to view or change workflows.
@Injectable()
export class RequiredFieldPromptWorkspaceService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowRunWorkspaceService: WorkflowRunWorkspaceService,
    private readonly workflowRunnerWorkspaceService: WorkflowRunnerWorkspaceService,
  ) {}

  async findMyPendingRequiredFields({
    workspaceId,
    workspaceMemberId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
  }): Promise<PendingRequiredField[]> {
    if (!isDefined(workspaceMemberId)) {
      return [];
    }

    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const workflowRunRepository =
          await this.globalWorkspaceOrmManager.getRepository<WorkflowRunWorkspaceEntity>(
            workspaceId,
            'workflowRun',
            { shouldBypassPermissionChecks: true },
          );

        // Only a RUNNING run can be parked on a prompt, and there are very few
        // at any moment, so filtering ownership in memory below is cheap.
        const runningWorkflowRuns = await workflowRunRepository.find({
          where: { status: WorkflowRunStatus.RUNNING },
        });

        const pendingRequiredFields: PendingRequiredField[] = [];

        for (const workflowRun of runningWorkflowRuns) {
          if (
            this.getInitiatorWorkspaceMemberId(workflowRun) !==
            workspaceMemberId
          ) {
            continue;
          }

          const step = this.findPendingStep(workflowRun);

          if (!isDefined(step)) {
            continue;
          }

          pendingRequiredFields.push({
            workflowRunId: workflowRun.id,
            stepId: step.id,
            label: step.settings.input.label,
            placeholder: step.settings.input.placeholder ?? null,
            type: step.settings.input.type,
            fieldMetadataId: step.settings.input.fieldMetadataId,
            objectNameSingular: step.settings.input.objectName,
            fieldName: step.settings.input.fieldName,
            recordId: this.getTriggerRecordId(workflowRun),
          });
        }

        return pendingRequiredFields;
      },
      authContext,
    );
  }

  async submitMyRequiredField({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
    value,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
    value: unknown;
  }): Promise<boolean> {
    const { workflowRun, step } = await this.getOwnedPendingStepOrThrow({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });

    if (!hasRequireFieldAnswer(value)) {
      throw new WorkflowVersionStepException(
        'No answer provided for required field step',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        { userFriendlyMessage: msg`Please fill this field before submitting.` },
      );
    }

    // Order matters: the action re-executes and reads the answer back off the
    // step definition, so persisting has to happen before the run is resumed.
    // Submitting first would re-run the step with nothing to write.
    await this.workflowRunWorkspaceService.updateWorkflowRunStep({
      workspaceId,
      workflowRunId: workflowRun.id,
      step: {
        ...step,
        settings: {
          ...step.settings,
          input: { ...step.settings.input, value },
        },
      },
    });

    await this.workflowRunnerWorkspaceService.submitFormStep({
      workspaceId,
      stepId,
      workflowRunId,
      response: { [step.settings.input.fieldName]: value },
    });

    return true;
  }

  async discardMyRequiredField({
    workspaceId,
    workspaceMemberId,
    workflowRunId,
    stepId,
  }: {
    workspaceId: string;
    workspaceMemberId: string;
    workflowRunId: string;
    stepId: string;
  }): Promise<boolean> {
    await this.getOwnedPendingStepOrThrow({
      workspaceId,
      workspaceMemberId,
      workflowRunId,
      stepId,
    });

    await this.workflowRunnerWorkspaceService.stopWorkflowRun(
      workspaceId,
      workflowRunId,
    );

    return true;
  }

  // Every mutation goes through here: it is the single place that proves the
  // caller owns the prompt they are acting on.
  private async getOwnedPendingStepOrThrow({
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
    step: WorkflowRequireFieldAction;
  }> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const workflowRun =
          await this.workflowRunWorkspaceService.getWorkflowRunOrFail({
            workflowRunId,
            workspaceId,
          });

        if (
          this.getInitiatorWorkspaceMemberId(workflowRun) !== workspaceMemberId
        ) {
          // Reported as not-found rather than forbidden on purpose: a caller
          // should not be able to learn that someone else's run exists.
          throw new WorkflowVersionStepException(
            'Required field prompt does not belong to this user',
            WorkflowVersionStepExceptionCode.NOT_FOUND,
            {
              userFriendlyMessage: msg`This request is no longer available.`,
            },
          );
        }

        const step = workflowRun.state?.flow?.steps?.find(
          (flowStep) => flowStep.id === stepId,
        );

        if (
          !isDefined(step) ||
          !isWorkflowRequireFieldAction(step) ||
          workflowRun.state?.stepInfos?.[stepId]?.status !== StepStatus.PENDING
        ) {
          throw new WorkflowVersionStepException(
            'Step is not a required field waiting for an answer',
            WorkflowVersionStepExceptionCode.INVALID_REQUEST,
            {
              userFriendlyMessage: msg`This step is no longer waiting for an answer.`,
            },
          );
        }

        return { workflowRun, step };
      },
      authContext,
    );
  }

  private findPendingStep(
    workflowRun: WorkflowRunWorkspaceEntity,
  ): WorkflowRequireFieldAction | undefined {
    const stepInfos = workflowRun.state?.stepInfos;

    return workflowRun.state?.flow?.steps?.find(
      (step): step is WorkflowRequireFieldAction =>
        isWorkflowRequireFieldAction(step) &&
        stepInfos?.[step.id]?.status === StepStatus.PENDING,
    );
  }

  // The trigger payload records who caused the event, which is more reliable
  // than createdBy: that is only populated for runs attributed to a person.
  private getInitiatorWorkspaceMemberId(
    workflowRun: WorkflowRunWorkspaceEntity,
  ): string | undefined {
    const triggerResult = workflowRun.state?.stepInfos?.['trigger']?.result as
      | { workspaceMemberId?: unknown }
      | undefined;

    if (typeof triggerResult?.workspaceMemberId === 'string') {
      return triggerResult.workspaceMemberId;
    }

    return workflowRun.createdBy?.workspaceMemberId ?? undefined;
  }

  private getTriggerRecordId(
    workflowRun: WorkflowRunWorkspaceEntity,
  ): string | null {
    const triggerResult = workflowRun.state?.stepInfos?.['trigger']?.result as
      | { recordId?: unknown }
      | undefined;

    return typeof triggerResult?.recordId === 'string'
      ? triggerResult.recordId
      : null;
  }
}
