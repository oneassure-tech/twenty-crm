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
    (actionType === 'FORM' || actionType === 'REQUIRE_FIELD') &&
    stepExecutionStatus === 'PENDING'
  );
};
