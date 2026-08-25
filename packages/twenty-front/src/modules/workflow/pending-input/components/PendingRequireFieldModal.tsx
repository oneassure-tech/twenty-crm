import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { DISCARD_MY_REQUIRED_FIELD } from '@/workflow/pending-input/graphql/mutations/discardMyRequiredField';
import { SUBMIT_MY_REQUIRED_FIELD } from '@/workflow/pending-input/graphql/mutations/submitMyRequiredField';
import { type PendingRequiredField } from '@/workflow/pending-input/types/PendingRequiredField';
import { WorkflowRequireFieldInput } from '@/workflow/workflow-steps/workflow-actions/require-field-action/components/WorkflowRequireFieldInput';
import { useMutation } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { hasRequireFieldAnswer } from 'twenty-shared/workflow';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';

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
  pendingStep: PendingRequiredField;
  onClosed: () => void;
  onSubmitted: () => void;
};

export const PendingRequireFieldModal = ({
  pendingStep,
  onClosed,
  onSubmitted,
}: PendingRequireFieldModalProps) => {
  const { t } = useLingui();
  const { closeModal } = useModal();
  const apolloCoreClient = useApolloCoreClient();

  // These two replaced submitFormStep / updateWorkflowRunStep / stopWorkflowRun.
  // All three sit behind the WORKFLOWS settings permission, so a member could
  // never have completed a prompt even once it was visible to them.
  const [submitMyRequiredField] = useMutation(SUBMIT_MY_REQUIRED_FIELD, {
    client: apolloCoreClient,
  });
  const [discardMyRequiredField] = useMutation(DISCARD_MY_REQUIRED_FIELD, {
    client: apolloCoreClient,
  });

  const { workflowRunId, stepId } = pendingStep;

  // Starts empty rather than seeded from the step: the prompt payload carries
  // no draft value, and a required field is unanswered by definition.
  const [value, setValue] = useState<unknown>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shares the answered-check with the server, so Submit can never be enabled
  // for a value the server would refuse to write.
  const canSubmit =
    !isSubmitting && !isDefined(error) && hasRequireFieldAnswer(value);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      await submitMyRequiredField({
        variables: { input: { workflowRunId, stepId, value } },
      });

      closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
      onSubmitted();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discarding abandons the whole run, not just this prompt. That is what makes
  // "stays until you deal with it" workable: there is no way to shrug the modal
  // off, so the only exits are answering or explicitly giving up.
  const handleDiscard = async () => {
    setIsSubmitting(true);

    try {
      await discardMyRequiredField({
        variables: { input: { workflowRunId, stepId } },
      });

      closeModal(PENDING_REQUIRE_FIELD_MODAL_ID);
      onClosed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalStatefulWrapper
      modalInstanceId={PENDING_REQUIRE_FIELD_MODAL_ID}
      onEnter={handleSubmit}
      // Not closable, and Escape / click-outside are ignored: the prompt has to
      // survive until it is answered or explicitly discarded.
      isClosable={false}
      shouldCloseModalOnClickOutsideOrEscape={false}
      padding="large"
      overlay="dark"
      dataGloballyPreventClickOutside
      renderInDocumentBody
      smallBorderRadius
      narrowWidth
      autoHeight
    >
      <H1Title
        title={pendingStep.label}
        fontColor={H1TitleFontColor.Primary}
      />
      <StyledInputContainer>
        <WorkflowRequireFieldInput
          input={{
            label: pendingStep.label,
            placeholder: pendingStep.placeholder ?? undefined,
            type: pendingStep.type,
            fieldMetadataId: pendingStep.fieldMetadataId,
            value,
          }}
          readonly={isSubmitting}
          onChange={setValue}
          onError={setError}
        />
      </StyledInputContainer>
      <StyledButtonContainer>
        <Button
          onClick={handleDiscard}
          variant="secondary"
          accent="danger"
          title={t`Discard`}
          disabled={isSubmitting}
          dataTestId="pending-require-field-discard-button"
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
