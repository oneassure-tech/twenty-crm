import { WorkflowActionType } from 'twenty-shared/workflow';
import {
  type WorkflowAction,
  type WorkflowRequireFieldAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowRequireFieldAction = (
  action: WorkflowAction,
): action is WorkflowRequireFieldAction =>
  action.type === WorkflowActionType.REQUIRE_FIELD;
