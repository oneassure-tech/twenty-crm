import { Injectable } from '@nestjs/common';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowUserFormAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/guards/is-workflow-user-form-action.guard';

@Injectable()
export class UserFormWorkflowAction implements WorkflowAction {
  async execute({
    currentStepId,
    steps,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      stepId: currentStepId,
      steps,
    });

    if (!isWorkflowUserFormAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a user form action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    // The run parks here until someone fills the form through
    // submitUserForm - or closes it through skipUserPrompt, which skips the
    // step instead of answering it.
    return {
      pendingEvent: true,
    };
  }
}
