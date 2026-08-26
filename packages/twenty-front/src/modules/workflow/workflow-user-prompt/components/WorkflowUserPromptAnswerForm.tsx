import { TextInput } from '@/ui/input/components/TextInput';
import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { USER_PROMPT_OTHER_OPTION_ID } from 'twenty-shared/workflow';
import { Radio, RadioGroup } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type WorkflowUserPromptAnswerFormProps = {
  prompt: Pick<
    PendingUserPrompt,
    'question' | 'options' | 'allowOtherOption' | 'otherOptionLabel'
  >;
  readonly?: boolean;
  selectedOptionId: string | null;
  onSelectedOptionIdChange: (selectedOptionId: string) => void;
  otherValue: string;
  onOtherValueChange: (otherValue: string) => void;
  isOtherSelected: boolean;
  onEnter?: () => void;
};

const StyledQuestion = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0 0 ${themeCssVariables.spacing[4]};
`;

const StyledOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledOtherInputContainer = styled.div`
  padding-left: ${themeCssVariables.spacing[6]};
  padding-top: ${themeCssVariables.spacing[1]};
`;

export const WorkflowUserPromptAnswerForm = ({
  prompt,
  readonly = false,
  selectedOptionId,
  onSelectedOptionIdChange,
  otherValue,
  onOtherValueChange,
  isOtherSelected,
  onEnter,
}: WorkflowUserPromptAnswerFormProps) => {
  const { t } = useLingui();

  return (
    <>
      <StyledQuestion>{prompt.question}</StyledQuestion>

      <StyledOptions>
        <RadioGroup
          value={selectedOptionId ?? ''}
          onValueChange={(value) => {
            if (readonly) {
              return;
            }

            onSelectedOptionIdChange(value);
          }}
        >
          {prompt.options.map((option) => (
            <Radio
              key={option.id}
              value={option.id}
              label={option.label}
              disabled={readonly}
            />
          ))}
          {prompt.allowOtherOption && (
            <Radio
              key={USER_PROMPT_OTHER_OPTION_ID}
              value={USER_PROMPT_OTHER_OPTION_ID}
              label={prompt.otherOptionLabel || t`Other`}
              disabled={readonly}
            />
          )}
        </RadioGroup>

        {isOtherSelected && (
          <StyledOtherInputContainer>
            <TextInput
              value={otherValue}
              onChange={onOtherValueChange}
              placeholder={t`Type your answer`}
              disabled={readonly}
              autoFocus
              fullWidth
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  onEnter?.();
                }
              }}
            />
          </StyledOtherInputContainer>
        )}
      </StyledOptions>
    </>
  );
};
