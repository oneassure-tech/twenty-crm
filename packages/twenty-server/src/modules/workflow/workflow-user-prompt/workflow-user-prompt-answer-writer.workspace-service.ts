import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isString } from '@sniptt/guards';
import { isValidUuid, resolveInput } from 'twenty-shared/utils';
import { getWorkflowRunContext } from 'twenty-shared/workflow';

import { UpdateRecordService } from 'src/engine/core-modules/record-crud/services/update-record.service';
import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { type WorkflowRunWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { buildWorkflowActorMetadata } from 'src/modules/workflow/workflow-executor/utils/build-workflow-actor-metadata.util';
import {
  type WorkflowUserFormAction,
  type WorkflowUserPromptAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import {
  type UpdatedRecordFieldsInfo,
  type UpdatedRecordInfo,
} from 'src/modules/workflow/workflow-user-prompt/types/pending-user-prompt.type';

// Writes what someone answered onto the record the step points at. Both
// human-input steps land here, so the record id resolution and the permission
// context they run under stay in one place.
@Injectable()
export class WorkflowUserPromptAnswerWriterWorkspaceService {
  constructor(
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly updateRecordService: UpdateRecordService,
    private readonly workflowCommonWorkspaceService: WorkflowCommonWorkspaceService,
  ) {}

  async writePromptAnswer({
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
    const { objectName, fieldName } = step.settings.input;

    const objectRecordId = this.resolveObjectRecordId({
      workflowRun,
      objectRecordId: step.settings.input.objectRecordId,
    });

    const { objectNameSingular, objectNamePlural } = await this.updateRecord({
      workspaceId,
      workflowRunId,
      objectName,
      objectRecordId,
      answers: { [fieldName]: answer },
    });

    return {
      success: true,
      objectNameSingular,
      objectNamePlural,
      recordId: objectRecordId,
      fieldName,
      answer,
    };
  }

  async writeFormAnswers({
    workspaceId,
    workflowRunId,
    workflowRun,
    step,
    answers,
  }: {
    workspaceId: string;
    workflowRunId: string;
    workflowRun: WorkflowRunWorkspaceEntity;
    step: WorkflowUserFormAction;
    answers: Record<string, unknown>;
  }): Promise<UpdatedRecordFieldsInfo> {
    const { objectName } = step.settings.input;

    const objectRecordId = this.resolveObjectRecordId({
      workflowRun,
      objectRecordId: step.settings.input.objectRecordId,
    });

    const { objectNameSingular, objectNamePlural } = await this.updateRecord({
      workspaceId,
      workflowRunId,
      objectName,
      objectRecordId,
      answers,
    });

    return {
      success: true,
      objectNameSingular,
      objectNamePlural,
      recordId: objectRecordId,
      answers,
    };
  }

  private resolveObjectRecordId({
    workflowRun,
    objectRecordId,
  }: {
    workflowRun: WorkflowRunWorkspaceEntity;
    objectRecordId: string;
  }): string {
    const context = getWorkflowRunContext(workflowRun.state?.stepInfos ?? {});

    // Only the record id is resolved: resolveInput walks and mutates whatever
    // it is handed, and an answer is the user's text, not a variable.
    const resolvedObjectRecordId = resolveInput(objectRecordId, context);

    if (
      !isString(resolvedObjectRecordId) ||
      !isValidUuid(resolvedObjectRecordId)
    ) {
      throw new WorkflowVersionStepException(
        `Failed to save the answer: "${resolvedObjectRecordId}" is not a valid record ID`,
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Could not find the record to save this answer to`,
        },
      );
    }

    return resolvedObjectRecordId;
  }

  private async updateRecord({
    workspaceId,
    workflowRunId,
    objectName,
    objectRecordId,
    answers,
  }: {
    workspaceId: string;
    workflowRunId: string;
    objectName: string;
    objectRecordId: string;
    answers: Record<string, unknown>;
  }): Promise<{ objectNameSingular: string; objectNamePlural: string }> {
    const fieldsToUpdate = Object.keys(answers);

    // A form whose optional questions were all left blank has nothing to
    // write, but the run still moves on.
    if (fieldsToUpdate.length > 0) {
      const executionContext =
        await this.workflowExecutionContextService.getExecutionContext({
          workflowRunId,
          workspaceId,
        });

      const toolOutput = await this.updateRecordService.execute({
        objectName,
        objectRecordId,
        objectRecord: answers,
        fieldsToUpdate,
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
    }

    const { flatObjectMetadata } =
      await this.workflowCommonWorkspaceService.getObjectMetadataInfo(
        objectName,
        workspaceId,
      );

    return {
      objectNameSingular: flatObjectMetadata.nameSingular,
      objectNamePlural: flatObjectMetadata.namePlural,
    };
  }
}
