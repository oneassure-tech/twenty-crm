import {
  type WorkflowRequireFieldAction,
  type WorkflowStep,
} from '@/workflow/types/Workflow';
import { isDefined } from 'twenty-shared/utils';
import { StepStatus, type WorkflowRunStepInfos } from 'twenty-shared/workflow';

export type PendingRequireFieldStep = {
  workflowRunId: string;
  step: WorkflowRequireFieldAction;
};

type WorkflowRunLike = {
  id: string;
  state?: {
    flow?: { steps?: WorkflowStep[] };
    stepInfos?: WorkflowRunStepInfos;
  } | null;
};

/**
 * Returns the first REQUIRE_FIELD step of a run that is parked waiting for an
 * answer, or undefined. A run can only ever wait on one at a time because a
 * pending step halts the branch it sits on.
 */
export const findPendingRequireFieldStep = (
  workflowRun: WorkflowRunLike | undefined | null,
): PendingRequireFieldStep | undefined => {
  if (!isDefined(workflowRun)) {
    return undefined;
  }

  const steps = workflowRun.state?.flow?.steps;
  const stepInfos = workflowRun.state?.stepInfos;

  if (!isDefined(steps) || !isDefined(stepInfos)) {
    return undefined;
  }

  const pendingStep = steps.find(
    (step): step is WorkflowRequireFieldAction =>
      step.type === 'REQUIRE_FIELD' &&
      stepInfos[step.id]?.status === StepStatus.PENDING,
  );

  if (!isDefined(pendingStep)) {
    return undefined;
  }

  return {
    workflowRunId: workflowRun.id,
    step: pendingStep,
  };
};
