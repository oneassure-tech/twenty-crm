import { Injectable } from '@nestjs/common';

import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/interfaces/workflow-action.interface';

import {
  WorkflowStepExecutorException,
  WorkflowStepExecutorExceptionCode,
} from 'src/modules/workflow/workflow-executor/exceptions/workflow-step-executor.exception';
import { type WorkflowActionInput } from 'src/modules/workflow/workflow-executor/types/workflow-action-input';
import { type WorkflowActionOutput } from 'src/modules/workflow/workflow-executor/types/workflow-action-output.type';
import { findStepOrThrow } from 'src/modules/workflow/workflow-executor/utils/find-step-or-throw.util';
import { isWorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/guards/is-workflow-user-prompt-action.guard';

@Injectable()
export class UserPromptWorkflowAction implements WorkflowAction {
  async execute({
    currentStepId,
    steps,
  }: WorkflowActionInput): Promise<WorkflowActionOutput> {
    const step = findStepOrThrow({
      stepId: currentStepId,
      steps,
    });

    if (!isWorkflowUserPromptAction(step)) {
      throw new WorkflowStepExecutorException(
        'Step is not a user prompt action',
        WorkflowStepExecutorExceptionCode.INVALID_STEP_TYPE,
      );
    }

    // The run parks here until someone answers the prompt through
    // submitUserPromptStep, which writes the answer and resumes the run.
    return {
      pendingEvent: true,
    };
  }
}
