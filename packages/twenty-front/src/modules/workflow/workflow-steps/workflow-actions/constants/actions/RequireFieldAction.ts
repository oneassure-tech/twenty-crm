import { type WorkflowActionType } from '@/workflow/types/Workflow';

export const REQUIRE_FIELD_ACTION: {
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'REQUIRE_FIELD'>;
  icon: string;
} = {
  defaultLabel: 'Required Field',
  type: 'REQUIRE_FIELD',
  icon: 'IconCheckbox',
};
