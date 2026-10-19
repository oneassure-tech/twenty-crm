import { type WorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { isWorkflowUserFormAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/guards/is-workflow-user-form-action.guard';
import { isWorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/guards/is-workflow-user-prompt-action.guard';

// A required question has no way out: the modal offers no Close button and the
// skip mutation refuses it, so the only way forward is answering it.
export const isUserPromptStepRequired = (step: WorkflowAction): boolean => {
  if (isWorkflowUserPromptAction(step)) {
    return step.settings.input.isRequired === true;
  }

  if (isWorkflowUserFormAction(step)) {
    // The form has no toggle of its own: it cannot be closed as soon as one of
    // its questions must be answered.
    return step.settings.input.questions.some(
      (question) => question.isRequired,
    );
  }

  return false;
};
