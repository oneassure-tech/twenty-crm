import { useModal } from '@/ui/layout/modal/hooks/useModal';
import {
  PENDING_REQUIRE_FIELD_MODAL_ID,
  PendingRequireFieldModal,
} from '@/workflow/pending-input/components/PendingRequireFieldModal';
import { usePendingRequireFieldStep } from '@/workflow/pending-input/hooks/usePendingRequireFieldStep';
import { useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

/**
 * Prompts the current user when a workflow they triggered is parked waiting for
 * them to fill a required field.
 *
 * Mounted once for the whole app so the prompt reaches them wherever they are,
 * rather than only inside the workflow run side panel.
 *
 * There is no local "dismissed" list: the prompt disappears only because the
 * run stopped waiting -- either it was answered, or it was discarded, which
 * stops the run outright. That is what keeps it on screen until dealt with.
 */
export const PendingRequireFieldPrompt = () => {
  const { pendingStep } = usePendingRequireFieldStep();
  const { openModal, closeModal } = useModal();

  const pendingWorkflowRunId = pendingStep?.workflowRunId;

  useEffect(() => {
    if (isDefined(pendingWorkflowRunId)) {
      openModal(PENDING_REQUIRE_FIELD_MODAL_ID);
    }
  }, [pendingWorkflowRunId, openModal]);

  if (!isDefined(pendingStep)) {
    return null;
  }

  return (
    <PendingRequireFieldModal
      // Remounts on a different run so the input never keeps a stale answer.
      key={pendingStep.workflowRunId}
      pendingStep={pendingStep}
      onClosed={() => closeModal(PENDING_REQUIRE_FIELD_MODAL_ID)}
    />
  );
};
