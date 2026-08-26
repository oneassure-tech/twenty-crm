import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const USER_PROMPT_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'USER_PROMPT'>;
  icon: string;
} = {
  defaultLabel: 'Ask User',
  type: 'USER_PROMPT',
  icon: 'IconListCheck',
};
