import { useSidePanelHistory } from '@/side-panel/hooks/useSidePanelHistory';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useWorkflowRunIdOrThrow } from '@/workflow/hooks/useWorkflowRunIdOrThrow';
import { type WorkflowRequireFieldAction } from '@/workflow/types/Workflow';
import { WorkflowRunSSESubscribeEffect } from '@/workflow/workflow-diagram/components/WorkflowRunSSESubscribeEffect';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepCmdEnterButton } from '@/workflow/workflow-steps/components/WorkflowStepCmdEnterButton';
import { useUpdateWorkflowRunStep } from '@/workflow/workflow-steps/hooks/useUpdateWorkflowRunStep';
import { useSubmitFormStep } from '@/workflow/workflow-steps/workflow-actions/form-action/hooks/useSubmitFormStep';
import { WorkflowRequireFieldInput } from '@/workflow/workflow-steps/workflow-actions/require-field-action/components/WorkflowRequireFieldInput';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { hasRequireFieldAnswer } from 'twenty-shared/workflow';

export type WorkflowEditActionRequireFieldFillerProps = {
  action: WorkflowRequireFieldAction;
  actionOptions: {
    readonly: boolean;
  };
};

export const WorkflowEditActionRequireFieldFiller = ({
  action,
  actionOptions,
}: WorkflowEditActionRequireFieldFillerProps) => {
  const { t } = useLingui();
  const { submitFormStep } = useSubmitFormStep();
  const { updateWorkflowRunStep } = useUpdateWorkflowRunStep();
  const workflowRunId = useWorkflowRunIdOrThrow();
  const { goBackFromSidePanel } = useSidePanelHistory();

  const [value, setValue] = useState<unknown>(action.settings.input.value);
  const [error, setError] = useState<string | undefined>(undefined);

  // This disabled state IS the requirement -- it uses the same shared predicate
  // the server action uses to decide whether the step is answered, so the two
  // cannot disagree.
  const canSubmit =
    !actionOptions.readonly && !isDefined(error) && hasRequireFieldAnswer(value);

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    const stepWithAnswer = {
      ...action,
      settings: {
        ...action.settings,
        input: { ...action.settings.input, value },
      },
    };

    // Persist the answer onto the run's step definition first: the step is
    // re-executed after submitting and reads the answer back from there.
    await updateWorkflowRunStep({
      workflowRunId,
      step: stepWithAnswer,
    });

    await submitFormStep({
      stepId: action.id,
      workflowRunId,
      response: { [action.settings.input.fieldName]: value },
    });

    goBackFromSidePanel();
  };

  return (
    <>
      <WorkflowRunSSESubscribeEffect workflowRunId={workflowRunId} />
      <WorkflowStepBody>
        <WorkflowRequireFieldInput
          input={action.settings.input}
          readonly={actionOptions.readonly}
          onChange={setValue}
          onError={setError}
        />
      </WorkflowStepBody>
      {!actionOptions.readonly && (
        <SidePanelFooter
          actions={[
            <WorkflowStepCmdEnterButton
              title={t`Submit`}
              onClick={onSubmit}
              disabled={!canSubmit}
            />,
          ]}
        />
      )}
    </>
  );
};
