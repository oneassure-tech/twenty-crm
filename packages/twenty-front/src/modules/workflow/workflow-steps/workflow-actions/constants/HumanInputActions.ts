import { type WorkflowActionType } from '@/workflow/types/Workflow';
import { FORM_ACTION } from '@/workflow/workflow-steps/workflow-actions/constants/actions/FormAction';
import { REQUIRE_FIELD_ACTION } from '@/workflow/workflow-steps/workflow-actions/constants/actions/RequireFieldAction';

export const HUMAN_INPUT_ACTIONS: Array<{
  defaultLabel: string;
  type: Extract<WorkflowActionType, 'FORM' | 'REQUIRE_FIELD'>;
  icon: string;
}> = [FORM_ACTION, REQUIRE_FIELD_ACTION];
