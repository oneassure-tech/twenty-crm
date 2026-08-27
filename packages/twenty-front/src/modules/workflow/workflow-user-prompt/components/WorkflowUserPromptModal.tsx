import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { WorkflowUserPromptAnswerForm } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptAnswerForm';
import { WORKFLOW_USER_PROMPT_MODAL_ID } from '@/workflow/workflow-user-prompt/constants/WorkflowUserPromptModalId';
import { useSubmitUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSubmitUserPrompt';
import { useUserPromptAnswer } from '@/workflow/workflow-user-prompt/hooks/useUserPromptAnswer';
import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type WorkflowUserPromptModalProps = {
  prompt: PendingUserPrompt;
  onAnswered: () => void;
};

const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${themeCssVariables.spacing[6]};
`;

export const WorkflowUserPromptModal = ({
  prompt,
  onAnswered,
}: WorkflowUserPromptModalProps) => {
  const { t } = useLingui();
  const { submitUserPrompt, isSubmittingUserPrompt } = useSubmitUserPrompt();

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

  return (
    <ModalStatefulWrapper
      // The answer is mandatory: no close button, and neither Escape nor a
      // click on the backdrop may dismiss the question.
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
      <StyledFooter>
        <Button
          title={t`Save`}
          variant="primary"
          accent="blue"
          disabled={!canSubmit || isSubmittingUserPrompt}
          isLoading={isSubmittingUserPrompt}
          onClick={submit}
        />
      </StyledFooter>
    </ModalStatefulWrapper>
  );
};
