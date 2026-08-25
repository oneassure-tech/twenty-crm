import { useModal } from '@/ui/layout/modal/hooks/useModal';
import {
  PENDING_REQUIRE_FIELD_MODAL_ID,
  PendingRequireFieldModal,
} from '@/workflow/pending-input/components/PendingRequireFieldModal';
import { PendingRequireFieldRecordRefresher } from '@/workflow/pending-input/components/PendingRequireFieldRecordRefresher';
import { usePendingRequireFieldStep } from '@/workflow/pending-input/hooks/usePendingRequireFieldStep';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';

type SubmittedTarget = {
  objectNameSingular: string;
  recordId: string;
  fieldName: string;
};

// Prompts the current user when a workflow they triggered is parked waiting for
// them to fill a required field. Mounted once for the whole app so the prompt
// reaches them wherever they are, not just in the workflow run side panel.
//
// An earlier version kept a local list of dismissed runs. That was removed: it
// only hid the prompt in this tab, so a reload brought it straight back. Now
// the prompt disappears solely because the run stopped waiting, which means
// either it was answered or Discard stopped the run outright.
export const PendingRequireFieldPrompt = () => {
  const { pendingStep, refetchPendingSteps } = usePendingRequireFieldStep();
  const { openModal, closeModal } = useModal();

  // Kept here rather than in the modal because the modal unmounts on submit,
  // while the record still has to be pulled back in afterwards.
  const [submittedTarget, setSubmittedTarget] = useState<SubmittedTarget>();

  const pendingWorkflowRunId = pendingStep?.workflowRunId;

  useEffect(() => {
    if (isDefined(pendingWorkflowRunId)) {
      openModal(PENDING_REQUIRE_FIELD_MODAL_ID);
    }
  }, [pendingWorkflowRunId, openModal]);

  return (
    <>
      {isDefined(pendingStep) && (
        <PendingRequireFieldModal
          // Remounts on a different run so the input never keeps a stale answer.
          key={pendingStep.workflowRunId}
          pendingStep={pendingStep}
          // Refetch on both exits so a second queued prompt, if any, opens
          // straight away instead of waiting for the next write.
          onClosed={() => {
            closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
            refetchPendingSteps();
          }}
          onSubmitted={() => {
            closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
            refetchPendingSteps();

            // Comes from the server, which resolves it from the trigger
            // payload. The step's own objectRecordId is an unresolved variable
            // template, so it could never be used to refresh anything.
            if (!isDefined(pendingStep.recordId)) {
              return;
            }

            setSubmittedTarget({
              objectNameSingular: pendingStep.objectNameSingular,
              recordId: pendingStep.recordId,
              fieldName: pendingStep.fieldName,
            });
          }}
        />
      )}
      {isDefined(submittedTarget) && (
        <PendingRequireFieldRecordRefresher
          key={submittedTarget.recordId}
          objectNameSingular={submittedTarget.objectNameSingular}
          recordId={submittedTarget.recordId}
          fieldName={submittedTarget.fieldName}
          onRefreshed={() => setSubmittedTarget(undefined)}
        />
      )}
    </>
  );
};
