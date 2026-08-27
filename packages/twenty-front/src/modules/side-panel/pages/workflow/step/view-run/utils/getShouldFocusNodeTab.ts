import {
  type WorkflowActionType,
  type WorkflowRunStepStatus,
} from '@/workflow/types/Workflow';

export const getShouldFocusNodeTab = ({
  stepExecutionStatus,
  actionType,
}: {
  stepExecutionStatus: WorkflowRunStepStatus;
  actionType: WorkflowActionType | undefined;
}) => {
  return (
    (actionType === 'FORM' || actionType === 'USER_PROMPT') &&
    stepExecutionStatus === 'PENDING'
  );
};
