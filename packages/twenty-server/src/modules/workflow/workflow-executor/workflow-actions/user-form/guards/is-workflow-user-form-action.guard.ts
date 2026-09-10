import { WorkflowActionType } from 'twenty-shared/workflow';
import {
  type WorkflowAction,
  type WorkflowUserFormAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const isWorkflowUserFormAction = (
  action: WorkflowAction,
): action is WorkflowUserFormAction =>
  action.type === WorkflowActionType.USER_FORM;
