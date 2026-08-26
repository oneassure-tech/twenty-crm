import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import {
  PENDING_REQUIRE_FIELD_MODAL_ID,
  PendingRequireFieldModal,
} from '@/workflow/pending-input/components/PendingRequireFieldModal';
import { usePendingRequireFieldStep } from '@/workflow/pending-input/hooks/usePendingRequireFieldStep';
import { dismissedPendingRequireFieldRunIdsState } from '@/workflow/pending-input/states/dismissedPendingRequireFieldRunIdsState';
import { useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

/**
 * Prompts the current user when a workflow they triggered is parked waiting for
 * them to fill a required field.
 *
 * Mounted once for the whole app so the prompt reaches them wherever they are,
 * rather than only inside the workflow run side panel.
 */
export const PendingRequireFieldPrompt = () => {
  const { pendingStep } = usePendingRequireFieldStep();
  const { openModal } = useModal();

  const [dismissedRunIds, setDismissedRunIds] = useAtomState(
    dismissedPendingRequireFieldRunIdsState,
  );

  const pendingWorkflowRunId = pendingStep?.workflowRunId;

  useEffect(() => {
    if (isDefined(pendingWorkflowRunId)) {
      openModal(PENDING_REQUIRE_FIELD_MODAL_ID);
    }
  }, [pendingWorkflowRunId, openModal]);

  if (!isDefined(pendingStep)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissedRunIds([...dismissedRunIds, pendingStep.workflowRunId]);
  };

  return (
    <PendingRequireFieldModal
      // Remounts on a different run so the input never keeps a stale answer.
      key={pendingStep.workflowRunId}
      pendingStep={pendingStep}
      onDismiss={handleDismiss}
      onSubmitted={handleDismiss}
    />
  );
};
