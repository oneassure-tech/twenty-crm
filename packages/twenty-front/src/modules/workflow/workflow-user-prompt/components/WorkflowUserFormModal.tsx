import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { WorkflowUserFormAnswerForm } from '@/workflow/workflow-user-prompt/components/WorkflowUserFormAnswerForm';
import { WorkflowUserPromptModalFooter } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptModalFooter';
import { WORKFLOW_USER_PROMPT_MODAL_ID } from '@/workflow/workflow-user-prompt/constants/WorkflowUserPromptModalId';
import { useSkipUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSkipUserPrompt';
import { useSubmitUserForm } from '@/workflow/workflow-user-prompt/hooks/useSubmitUserForm';
import { useUserFormAnswers } from '@/workflow/workflow-user-prompt/hooks/useUserFormAnswers';
import { useUserFormQuestionFields } from '@/workflow/workflow-user-prompt/hooks/useUserFormQuestionFields';
import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';

export type WorkflowUserFormModalProps = {
  prompt: PendingUserPrompt;
  onAnswered: () => void;
};

export const WorkflowUserFormModal = ({
  prompt,
  onAnswered,
}: WorkflowUserFormModalProps) => {
  const { submitUserForm, isSubmittingUserForm } = useSubmitUserForm();
  const { skipUserPrompt, isSkippingUserPrompt } = useSkipUserPrompt();

  const questionFields = useUserFormQuestionFields({
    objectNameSingular: prompt.objectNameSingular,
    questions: prompt.questions,
  });

  const { answers, setAnswer, setFieldError, canSubmit, submit } =
    useUserFormAnswers({
      questionFields,
      onSubmit: async (submittedAnswers) => {
        const isSuccess = await submitUserForm({
          workflowRunId: prompt.workflowRunId,
          stepId: prompt.stepId,
          answers: submittedAnswers,
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
      // telling the server, so the next poll would reopen the same questions.
      modalInstanceId={WORKFLOW_USER_PROMPT_MODAL_ID}
      isClosable={false}
      shouldCloseModalOnClickOutsideOrEscape={false}
      dataGloballyPreventClickOutside
      renderInDocumentBody
      padding="large"
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      <WorkflowUserFormAnswerForm
        questionFields={questionFields}
        answers={answers}
        onAnswerChange={setAnswer}
        onFieldError={setFieldError}
      />
      <WorkflowUserPromptModalFooter
        onClose={() => void close()}
        onSave={submit}
        isSaveDisabled={!canSubmit}
        isSaving={isSubmittingUserForm}
        isClosing={isSkippingUserPrompt}
      />
    </ModalStatefulWrapper>
  );
};
