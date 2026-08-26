import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { USER_PROMPT_OTHER_OPTION_ID } from 'twenty-shared/workflow';

export type UserPromptAnswer = {
  selectedOptionId: string;
  otherValue?: string;
};

export const useUserPromptAnswer = ({
  prompt,
  readonly = false,
  onSubmit,
}: {
  prompt: Pick<PendingUserPrompt, 'allowOtherOption'>;
  readonly?: boolean;
  onSubmit: (answer: UserPromptAnswer) => void | Promise<void>;
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [otherValue, setOtherValue] = useState('');

  const isOtherSelected =
    prompt.allowOtherOption && selectedOptionId === USER_PROMPT_OTHER_OPTION_ID;

  // Exactly one answer is required and there is no way out of the prompt, so
  // the only guard is that the answer is actually filled in.
  const canSubmit =
    !readonly &&
    isNonEmptyString(selectedOptionId) &&
    (!isOtherSelected || isNonEmptyString(otherValue.trim()));

  const submit = () => {
    if (!canSubmit || selectedOptionId === null) {
      return;
    }

    void onSubmit({
      selectedOptionId,
      otherValue: isOtherSelected ? otherValue.trim() : undefined,
    });
  };

  return {
    selectedOptionId,
    setSelectedOptionId,
    otherValue,
    setOtherValue,
    isOtherSelected,
    canSubmit,
    submit,
  };
};
