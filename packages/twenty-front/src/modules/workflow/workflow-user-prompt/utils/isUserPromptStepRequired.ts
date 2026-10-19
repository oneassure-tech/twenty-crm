import {
  type WorkflowUserFormAction,
  type WorkflowUserPromptAction,
} from '@/workflow/types/Workflow';

// A required question offers no Close button. The Ask User Form step has no
// toggle of its own: it is required as soon as one of its questions is.
export const isUserPromptStepRequired = (
  action: WorkflowUserPromptAction | WorkflowUserFormAction,
): boolean =>
  action.type === 'USER_PROMPT'
    ? action.settings.input.isRequired === true
    : action.settings.input.questions.some((question) => question.isRequired);
