import { type WorkflowActionType } from '@/workflow/types/Workflow';
import { FORM_ACTION } from '@/workflow/workflow-steps/workflow-actions/constants/actions/FormAction';
import { USER_PROMPT_ACTION } from '@/workflow/workflow-steps/workflow-actions/constants/actions/UserPromptAction';

export const HUMAN_INPUT_ACTIONS: Array<{
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'FORM' | 'USER_PROMPT'>;
  icon: string;
}> = [FORM_ACTION, USER_PROMPT_ACTION];
