import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const USER_FORM_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'USER_FORM'>;
  icon: string;
} = {
  defaultLabel: 'Ask User Form',
  type: 'USER_FORM',
  icon: 'IconForms',
};
