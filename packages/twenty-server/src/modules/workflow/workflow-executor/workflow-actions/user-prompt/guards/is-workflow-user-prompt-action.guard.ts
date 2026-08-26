import { WorkflowActionType } from 'twenty-shared/workflow';
import {
  type WorkflowAction,
  type WorkflowUserPromptAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowUserPromptAction = (
  action: WorkflowAction,
): action is WorkflowUserPromptAction =>
  action.type === WorkflowActionType.USER_PROMPT;
