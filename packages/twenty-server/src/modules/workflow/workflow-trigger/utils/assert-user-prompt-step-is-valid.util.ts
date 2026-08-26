import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { type WorkflowUserPromptActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/types/workflow-user-prompt-action-settings.type';
import {
  WorkflowTriggerException,
  WorkflowTriggerExceptionCode,
} from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';

export function assertUserPromptStepIsValid(
  settings: WorkflowUserPromptActionSettings,
) {
  const input = settings.input;

  if (!input) {
    throw new WorkflowTriggerException(
      'No input provided in user prompt step',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_TRIGGER,
      {
        userFriendlyMessage: msg`No input provided in Ask User step`,
      },
    );
  }

  if (!isNonEmptyString(input.question)) {
    throw new WorkflowTriggerException(
      'User prompt step must have a question',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step must have a question`,
      },
    );
  }

  if (!Array.isArray(input.options) || input.options.length === 0) {
    throw new WorkflowTriggerException(
      'User prompt step must have at least one option',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step must have at least one option`,
      },
    );
  }

  if (input.options.some((option) => !isNonEmptyString(option.label))) {
    throw new WorkflowTriggerException(
      'User prompt step options must have a label',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step options must have a label`,
      },
    );
  }

  const optionLabels = input.options.map((option) => option.label);

  if (optionLabels.length !== new Set(optionLabels).size) {
    throw new WorkflowTriggerException(
      'User prompt step options must be unique',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step options must be unique`,
      },
    );
  }

  if (
    !isNonEmptyString(input.objectName) ||
    !isNonEmptyString(input.fieldName)
  ) {
    throw new WorkflowTriggerException(
      'User prompt step must have a field to save the answer to',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step must have a field to save the answer to`,
      },
    );
  }

  if (!isNonEmptyString(input.objectRecordId)) {
    throw new WorkflowTriggerException(
      'User prompt step must have a record to update',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User step must have a record to update`,
      },
    );
  }
}
