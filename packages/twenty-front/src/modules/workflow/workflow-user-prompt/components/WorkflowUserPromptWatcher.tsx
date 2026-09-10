import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { WorkflowUserFormModal } from '@/workflow/workflow-user-prompt/components/WorkflowUserFormModal';
import { WorkflowUserPromptModal } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptModal';
import { WORKFLOW_USER_PROMPT_MODAL_ID } from '@/workflow/workflow-user-prompt/constants/WorkflowUserPromptModalId';
import { usePendingUserPrompts } from '@/workflow/workflow-user-prompt/hooks/usePendingUserPrompts';
import { useEffect } from 'react';
import { isDefined } from 'twenty-shared/utils';

// Mounted once for the whole authenticated app so an Ask User or Ask User Form
// step reaches the person who triggered it wherever they are - a record page, a table cell or a
// kanban drag - and comes back on reload until they answer.
export const WorkflowUserPromptWatcher = () => {
  const { openModal, closeModal } = useModal();
  const { pendingUserPrompts, refetchPendingUserPrompts } =
    usePendingUserPrompts();

  const currentPrompt = pendingUserPrompts.at(0);
  const hasPendingPrompt = isDefined(currentPrompt);

  // Owning the open state here rather than in the modal keeps it open for
  // exactly as long as something is pending, however the list changes.
  useEffect(() => {
    if (hasPendingPrompt) {
      openModal(WORKFLOW_USER_PROMPT_MODAL_ID);
    } else {
      closeModal(WORKFLOW_USER_PROMPT_MODAL_ID);
    }
  }, [hasPendingPrompt, openModal, closeModal]);

  if (!isDefined(currentPrompt)) {
    return null;
  }

  // Keyed on the step so the next queued question starts with a blank answer.
  if (currentPrompt.kind === 'USER_FORM') {
    return (
      <WorkflowUserFormModal
        key={currentPrompt.stepId}
        prompt={currentPrompt}
        onAnswered={refetchPendingUserPrompts}
      />
    );
  }

  return (
    <WorkflowUserPromptModal
      key={currentPrompt.stepId}
      prompt={currentPrompt}
      onAnswered={refetchPendingUserPrompts}
    />
  );
};
