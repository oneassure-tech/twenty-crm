import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { WorkflowUserPromptAnswerForm } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptAnswerForm';
import { WorkflowUserPromptModalFooter } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptModalFooter';
import { WORKFLOW_USER_PROMPT_MODAL_ID } from '@/workflow/workflow-user-prompt/constants/WorkflowUserPromptModalId';
import { useSkipUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSkipUserPrompt';
import { useSubmitUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSubmitUserPrompt';
import { useUserPromptAnswer } from '@/workflow/workflow-user-prompt/hooks/useUserPromptAnswer';
import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';

export type WorkflowUserPromptModalProps = {
  prompt: PendingUserPrompt;
  onAnswered: () => void;
};

export const WorkflowUserPromptModal = ({
  prompt,
  onAnswered,
}: WorkflowUserPromptModalProps) => {
  const { submitUserPrompt, isSubmittingUserPrompt } = useSubmitUserPrompt();
  const { skipUserPrompt, isSkippingUserPrompt } = useSkipUserPrompt();

  const {
    selectedOptionId,
    setSelectedOptionId,
    otherValue,
    setOtherValue,
    isOtherSelected,
    canSubmit,
    submit,
  } = useUserPromptAnswer({
    prompt,
    onSubmit: async (answer) => {
      const isSuccess = await submitUserPrompt({
        workflowRunId: prompt.workflowRunId,
        stepId: prompt.stepId,
        ...answer,
      });

      if (isSuccess) {
        onAnswered();
      }
    },
  });

  const close = async () => {
    const isSuccess = await skipUserPrompt({
      workflowRunId: prompt.workflowRunId,
      stepId: prompt.stepId,
    });

    if (isSuccess) {
      onAnswered();
    }
  };

  return (
    <ModalStatefulWrapper
      // The only way out is the Close button, which skips the step server-side.
      // Escape and a click on the backdrop would dismiss the modal without
      // telling the server, so the next poll would reopen the same question.
      modalInstanceId={WORKFLOW_USER_PROMPT_MODAL_ID}
      isClosable={false}
      shouldCloseModalOnClickOutsideOrEscape={false}
      onEnter={submit}
      dataGloballyPreventClickOutside
      renderInDocumentBody
      padding="large"
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      <WorkflowUserPromptAnswerForm
        prompt={prompt}
        selectedOptionId={selectedOptionId}
        onSelectedOptionIdChange={setSelectedOptionId}
        otherValue={otherValue}
        onOtherValueChange={setOtherValue}
        isOtherSelected={isOtherSelected}
        onEnter={submit}
      />
      <WorkflowUserPromptModalFooter
        onClose={() => void close()}
        onSave={submit}
        isSaveDisabled={!canSubmit}
        isSaving={isSubmittingUserPrompt}
        isClosing={isSkippingUserPrompt}
      />
    </ModalStatefulWrapper>
  );
};
