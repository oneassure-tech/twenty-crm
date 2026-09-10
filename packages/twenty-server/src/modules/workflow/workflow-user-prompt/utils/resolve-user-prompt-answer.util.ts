import { msg } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { USER_PROMPT_OTHER_OPTION_ID } from 'twenty-shared/workflow';

import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { type WorkflowUserPromptAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const resolveUserPromptAnswer = ({
  step,
  selectedOptionId,
  otherValue,
}: {
  step: WorkflowUserPromptAction;
  selectedOptionId: string;
  otherValue?: string;
}): { answer: string; isOther: boolean } => {
  const { options, allowOtherOption } = step.settings.input;

  if (selectedOptionId === USER_PROMPT_OTHER_OPTION_ID) {
    if (!allowOtherOption) {
      throw new WorkflowVersionStepException(
        'This user prompt does not allow a typed answer',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`This question does not allow a typed answer`,
        },
      );
    }

    const trimmedOtherValue = otherValue?.trim();

    // The prompt has no discard path, so an empty answer must be refused here
    // too and not only in the modal.
    if (!isDefined(trimmedOtherValue) || trimmedOtherValue.length === 0) {
      throw new WorkflowVersionStepException(
        'A typed answer is required',
        WorkflowVersionStepExceptionCode.INVALID_REQUEST,
        {
          userFriendlyMessage: msg`Please type your answer`,
        },
      );
    }

    return { answer: trimmedOtherValue, isOther: true };
  }

  const selectedOption = options.find(
    (option) => option.id === selectedOptionId,
  );

  if (!isDefined(selectedOption)) {
    throw new WorkflowVersionStepException(
      'Selected option does not exist on this user prompt',
      WorkflowVersionStepExceptionCode.INVALID_REQUEST,
      {
        userFriendlyMessage: msg`Please choose one of the available options`,
      },
    );
  }

  return { answer: selectedOption.label, isOther: false };
};
