import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type WorkflowUserPromptModalFooterProps = {
  onClose: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
  isSaving: boolean;
  isClosing: boolean;
};

const StyledFooter = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-end;
  margin-top: ${themeCssVariables.spacing[6]};
`;

export const WorkflowUserPromptModalFooter = ({
  onClose,
  onSave,
  isSaveDisabled,
  isSaving,
  isClosing,
}: WorkflowUserPromptModalFooterProps) => {
  const { t } = useLingui();

  return (
    <StyledFooter>
      <Button
        title={t`Close`}
        variant="secondary"
        disabled={isSaving || isClosing}
        isLoading={isClosing}
        onClick={onClose}
      />
      <Button
        title={t`Save`}
        variant="primary"
        accent="blue"
        disabled={isSaveDisabled || isSaving || isClosing}
        isLoading={isSaving}
        onClick={onSave}
      />
    </StyledFooter>
  );
};
