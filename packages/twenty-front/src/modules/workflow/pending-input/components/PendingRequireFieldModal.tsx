import { useUpdateWorkflowRunStep } from '@/workflow/workflow-steps/hooks/useUpdateWorkflowRunStep';
import { useSubmitFormStep } from '@/workflow/workflow-steps/workflow-actions/form-action/hooks/useSubmitFormStep';
import { WorkflowRequireFieldInput } from '@/workflow/workflow-steps/workflow-actions/require-field-action/components/WorkflowRequireFieldInput';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { type PendingRequireFieldStep } from '@/workflow/pending-input/utils/findPendingRequireFieldStep';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { hasRequireFieldAnswer } from 'twenty-shared/workflow';
import { Button } from 'twenty-ui/input';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const PENDING_REQUIRE_FIELD_MODAL_ID = 'pending-require-field-modal';

const StyledInputContainer = styled.div`
  margin-bottom: ${themeCssVariables.spacing[6]};
  margin-top: ${themeCssVariables.spacing[4]};
`;

const StyledButtonContainer = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
`;

type PendingRequireFieldModalProps = {
  pendingStep: PendingRequireFieldStep;
  onDismiss: () => void;
  onSubmitted: () => void;
};

export const PendingRequireFieldModal = ({
  pendingStep,
  onDismiss,
  onSubmitted,
}: PendingRequireFieldModalProps) => {
  const { t } = useLingui();
  const { closeModal } = useModal();
  const { submitFormStep } = useSubmitFormStep();
  const { updateWorkflowRunStep } = useUpdateWorkflowRunStep();

  const { workflowRunId, step } = pendingStep;

  const [value, setValue] = useState<unknown>(step.settings.input.value);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shares the answered-check with the server action, so Submit can never be
  // enabled for a value the action would refuse to write.
  const canSubmit =
    !isSubmitting && !isDefined(error) && hasRequireFieldAnswer(value);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      // The answer must land on the run's step definition before submitting:
      // the step is re-executed and reads it back from there.
      await updateWorkflowRunStep({
        workflowRunId,
        step: {
          ...step,
          settings: {
            ...step.settings,
            input: { ...step.settings.input, value },
          },
        },
      });

      await submitFormStep({
        stepId: step.id,
        workflowRunId,
        response: { [step.settings.input.fieldName]: value },
      });

      closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
    onDismiss();
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={PENDING_REQUIRE_FIELD_MODAL_ID}
      onClose={handleDismiss}
      onEnter={handleSubmit}
      isClosable={true}
      padding="large"
      overlay="dark"
      dataGloballyPreventClickOutside
      renderInDocumentBody
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      <H1Title
        title={step.settings.input.label}
        fontColor={H1TitleFontColor.Primary}
      />
      <StyledInputContainer>
        <WorkflowRequireFieldInput
          input={{ ...step.settings.input, value }}
          readonly={isSubmitting}
          onChange={setValue}
          onError={setError}
        />
      </StyledInputContainer>
      <StyledButtonContainer>
        <Button
          onClick={handleDismiss}
          variant="secondary"
          title={t`Later`}
          dataTestId="pending-require-field-dismiss-button"
        />
        <Button
          onClick={handleSubmit}
          variant="primary"
          accent="blue"
          title={t`Submit`}
          disabled={!canSubmit}
          dataTestId="pending-require-field-submit-button"
        />
      </StyledButtonContainer>
    </ModalStatefulWrapper>
  );
};
