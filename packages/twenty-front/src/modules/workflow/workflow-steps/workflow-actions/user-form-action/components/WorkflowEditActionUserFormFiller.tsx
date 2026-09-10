import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { type WorkflowUserFormAction } from '@/workflow/types/Workflow';
import { WorkflowRunSSESubscribeEffect } from '@/workflow/workflow-diagram/components/WorkflowRunSSESubscribeEffect';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepCmdEnterButton } from '@/workflow/workflow-steps/components/WorkflowStepCmdEnterButton';
import { WorkflowUserFormAnswerForm } from '@/workflow/workflow-user-prompt/components/WorkflowUserFormAnswerForm';
import { useSkipUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSkipUserPrompt';
import { useSubmitUserForm } from '@/workflow/workflow-user-prompt/hooks/useSubmitUserForm';
import { useUserFormAnswers } from '@/workflow/workflow-user-prompt/hooks/useUserFormAnswers';
import { useUserFormQuestionFields } from '@/workflow/workflow-user-prompt/hooks/useUserFormQuestionFields';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';

export type WorkflowEditActionUserFormFillerProps = {
  action: WorkflowUserFormAction;
  actionOptions: {
    readonly: boolean;
  };
};

// Fallback for filling an Ask User Form step from the workflow run itself. The
// modal is the normal path, but a run triggered by an API key has no acting
// workspace member to show it to, so the step must stay answerable here.
export const WorkflowEditActionUserFormFiller = ({
  action,
  actionOptions,
}: WorkflowEditActionUserFormFillerProps) => {
  const { t } = useLingui();
  const workflowRunId = useWorkflowRunIdOrThrow();
  const { goBackFromSidePanel } = useSidePanelHistory();
  const { submitUserForm, isSubmittingUserForm } = useSubmitUserForm();
  const { skipUserPrompt, isSkippingUserPrompt } = useSkipUserPrompt();

  const questionFields = useUserFormQuestionFields({
    objectNameSingular: action.settings.input.objectName,
    questions: action.settings.input.questions,
  });

  const { answers, setAnswer, setFieldError, canSubmit, submit } =
    useUserFormAnswers({
      questionFields,
      readonly: actionOptions.readonly,
      onSubmit: async (submittedAnswers) => {
        const isSuccess = await submitUserForm({
          workflowRunId,
          stepId: action.id,
          answers: submittedAnswers,
        });

        if (isSuccess) {
          goBackFromSidePanel();
        }
      },
    });

  const close = async () => {
    const isSuccess = await skipUserPrompt({
      workflowRunId,
      stepId: action.id,
    });

    if (isSuccess) {
      goBackFromSidePanel();
    }
  };

  return (
    <>
      <WorkflowRunSSESubscribeEffect workflowRunId={workflowRunId} />
      <WorkflowStepBody>
        <WorkflowUserFormAnswerForm
          questionFields={questionFields}
          answers={answers}
          onAnswerChange={setAnswer}
          onFieldError={setFieldError}
          readonly={actionOptions.readonly}
        />
      </WorkflowStepBody>
      {!actionOptions.readonly && (
        <SidePanelFooter
          actions={[
            <Button
              title={t`Close`}
              variant="secondary"
              disabled={isSubmittingUserForm || isSkippingUserPrompt}
              isLoading={isSkippingUserPrompt}
              onClick={() => void close()}
            />,
            <WorkflowStepCmdEnterButton
              title={t`Save`}
              onClick={submit}
              disabled={
                !canSubmit || isSubmittingUserForm || isSkippingUserPrompt
              }
            />,
          ]}
        />
      )}
    </>
  );
};
