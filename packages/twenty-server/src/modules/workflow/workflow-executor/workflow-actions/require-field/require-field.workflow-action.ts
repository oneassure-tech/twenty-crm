import { Injectable } from '@nestjs/common';

import { isDefined, isValidUuid, resolveInput } from 'twenty-shared/utils';
import { hasRequireFieldAnswer } from 'twenty-shared/workflow';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import { UpdateRecordService } from 'src/engine/core-modules/record-crud/services/update-record.service';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { buildWorkflowActorMetadata } from 'src/modules/workflow/workflow-executor/utils/build-workflow-actor-metadata.util';
import { filterValidFieldsInRecord } from 'src/modules/workflow/workflow-executor/utils/filter-valid-fields-in-record.util';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowRequireFieldAction } from 'src/modules/workflow/workflow-executor/workflow-actions/require-field/guards/is-workflow-require-field-action.guard';
import { type WorkflowRequireFieldActionInput } from 'src/modules/workflow/workflow-executor/workflow-actions/require-field/types/workflow-require-field-action-settings.type';

// Asks a human to fill one field on one record, then writes the answer there.
//
// The step executes twice. On the first pass no answer exists yet, so it parks
// the run with pendingEvent. Submitting an answer stores it on the step
// definition and re-runs this same step (see submitFormStep), and the second
// pass performs the write. That keeps the record update inside the action,
// where UpdateRecordWorkflowAction also does it, and needs no engine change.
@Injectable()
export class RequireFieldWorkflowAction implements WorkflowAction {
  constructor(
    private readonly updateRecordService: UpdateRecordService,
    private readonly workflowExecutionContextService: WorkflowExecutionContextService,
    private readonly workflowCommonWorkspaceService: WorkflowCommonWorkspaceService,
  ) {}

  async execute({
    currentStepId,
    steps,
    context,
    runInfo,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      steps,
      stepId: currentStepId,
    });

    if (!isWorkflowRequireFieldAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a require field action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    const rawInput = step.settings.input;

    // Nobody has answered yet: park the run and wait to be re-executed.
    if (!hasRequireFieldAnswer(rawInput.value)) {
      return {
        pendingEvent: true,
      };
    }

    const { workspaceId } = runInfo;

    // The answer is typed by a human and must stay verbatim -- running it
    // through resolveInput would treat any "{{...}}" they typed as a variable.
    const { value, ...configuration } = rawInput;

    const resolvedConfiguration = resolveInput(
      configuration,
      context,
    ) as Omit<WorkflowRequireFieldActionInput, 'value'>;

    const { objectName, objectRecordId, fieldName } = resolvedConfiguration;

    if (!isDefined(objectName) || !isDefined(fieldName)) {
      throw new WorkflowStepExecutorException(
        'Failed to update: Object name and field name are required',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    if (!isDefined(objectRecordId) || !isValidUuid(objectRecordId)) {
      throw new WorkflowStepExecutorException(
        'Failed to update: Object record ID must be a valid UUID',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const objectMetadataInfo =
      await this.workflowCommonWorkspaceService.getObjectMetadataInfo(
        objectName,
        workspaceId,
      );

    const filteredObjectRecord = filterValidFieldsInRecord(
      { [fieldName]: value },
      objectMetadataInfo.flatObjectMetadata,
      objectMetadataInfo.flatFieldMetadataMaps,
    );

    if (!(fieldName in filteredObjectRecord)) {
      throw new WorkflowStepExecutorException(
        `Failed to update: Field "${fieldName}" does not exist on "${objectName}"`,
        WorkflowStepExecutorExceptionCode.INVALID_STEP_INPUT,
      );
    }

    const executionContext =
      await this.workflowExecutionContextService.getExecutionContext(runInfo);

    const updatedBy = buildWorkflowActorMetadata(executionContext);

    const toolOutput = await this.updateRecordService.execute({
      objectName,
      objectRecordId,
      objectRecord: filteredObjectRecord,
      fieldsToUpdate: [fieldName],
      authContext: executionContext.authContext,
      updatedBy,
      rolePermissionConfig: executionContext.rolePermissionConfig,
    });

    if (!toolOutput.success) {
      return { error: toolOutput.error || toolOutput.message };
    }

    return {
      result: toolOutput.result,
    };
  }
}
