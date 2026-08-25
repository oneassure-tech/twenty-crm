import {
  type WorkflowRequireFieldAction,
  type WorkflowStep,
} from '@/workflow/types/Workflow';
import { isDefined } from 'twenty-shared/utils';
import { StepStatus, type WorkflowRunStepInfos } from 'twenty-shared/workflow';

export type PendingRequireFieldStep = {
  workflowRunId: string;
  step: WorkflowRequireFieldAction;
  // Id of the record that triggered the run. Read from the trigger payload
  // because `settings.input.objectRecordId` holds an unresolved variable
  // template such as {{trigger.properties.after.id}}, not a real id.
  triggerRecordId: string | undefined;
};

type WorkflowRunLike = {
  id: string;
  state?: {
    flow?: { steps?: WorkflowStep[] };
    stepInfos?: WorkflowRunStepInfos;
  } | null;
};

const getTriggerRecordId = (
  stepInfos: WorkflowRunStepInfos,
): string | undefined => {
  const triggerResult = stepInfos['trigger']?.result;

  if (!isDefined(triggerResult) || typeof triggerResult !== 'object') {
    return undefined;
  }

  const recordId = (triggerResult as { recordId?: unknown }).recordId;

  return typeof recordId === 'string' ? recordId : undefined;
};

// Returns the REQUIRE_FIELD step a run is parked on, if any. Only ever one at a
// time, because a pending step halts the branch it sits on.
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
    triggerRecordId: getTriggerRecordId(stepInfos),
  };
};
