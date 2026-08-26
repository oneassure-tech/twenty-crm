import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { type WorkflowUserPromptAction } from '@/workflow/types/Workflow';
import { WorkflowRunSSESubscribeEffect } from '@/workflow/workflow-diagram/components/WorkflowRunSSESubscribeEffect';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepCmdEnterButton } from '@/workflow/workflow-steps/components/WorkflowStepCmdEnterButton';
import { WorkflowUserPromptAnswerForm } from '@/workflow/workflow-user-prompt/components/WorkflowUserPromptAnswerForm';
import { useSubmitUserPrompt } from '@/workflow/workflow-user-prompt/hooks/useSubmitUserPrompt';
import { useUserPromptAnswer } from '@/workflow/workflow-user-prompt/hooks/useUserPromptAnswer';
import { useLingui } from '@lingui/react/macro';

export type WorkflowEditActionUserPromptFillerProps = {
  action: WorkflowUserPromptAction;
  actionOptions: {
    readonly: boolean;
  };
};

// Fallback for answering an Ask User step from the workflow run itself. The
// modal is the normal path, but a run triggered by an API key has no acting
// workspace member to show it to, so the step must stay answerable here.
export const WorkflowEditActionUserPromptFiller = ({
  action,
  actionOptions,
}: WorkflowEditActionUserPromptFillerProps) => {
  const { t } = useLingui();
  const workflowRunId = useWorkflowRunIdOrThrow();
  const { goBackFromSidePanel } = useSidePanelHistory();
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
    prompt: action.settings.input,
    readonly: actionOptions.readonly,
    onSubmit: async (answer) => {
      const isSuccess = await submitUserPrompt({
        workflowRunId,
        stepId: action.id,
        ...answer,
      });

      if (isSuccess) {
        goBackFromSidePanel();
      }
    },
  });

  return (
    <>
      <WorkflowRunSSESubscribeEffect workflowRunId={workflowRunId} />
      <WorkflowStepBody>
        <WorkflowUserPromptAnswerForm
          prompt={action.settings.input}
          readonly={actionOptions.readonly}
          selectedOptionId={selectedOptionId}
          onSelectedOptionIdChange={setSelectedOptionId}
          otherValue={otherValue}
          onOtherValueChange={setOtherValue}
          isOtherSelected={isOtherSelected}
          onEnter={submit}
        />
      </WorkflowStepBody>
      {!actionOptions.readonly && (
        <SidePanelFooter
          actions={[
            <WorkflowStepCmdEnterButton
              title={t`Save`}
              onClick={submit}
              disabled={!canSubmit || isSubmittingUserPrompt}
            />,
          ]}
        />
      )}
    </>
  );
};
