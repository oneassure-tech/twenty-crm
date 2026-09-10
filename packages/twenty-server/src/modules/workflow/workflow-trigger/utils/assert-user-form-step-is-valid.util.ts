import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { type WorkflowUserFormActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/types/workflow-user-form-action-settings.type';
import {
  WorkflowTriggerException,
  WorkflowTriggerExceptionCode,
} from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';

export function assertUserFormStepIsValid(
  settings: WorkflowUserFormActionSettings,
) {
  const input = settings.input;

  if (!input) {
    throw new WorkflowTriggerException(
      'No input provided in user form step',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_TRIGGER,
      {
        userFriendlyMessage: msg`No input provided in Ask User Form step`,
      },
    );
  }

  if (!Array.isArray(input.questions) || input.questions.length === 0) {
    throw new WorkflowTriggerException(
      'User form step must have at least one question',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User Form step must have at least one question`,
      },
    );
  }

  if (
    input.questions.some((question) => !isNonEmptyString(question.question))
  ) {
    throw new WorkflowTriggerException(
      'User form step questions must have a question',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Every question in the Ask User Form step must be filled in`,
      },
    );
  }

  if (
    input.questions.some((question) => !isNonEmptyString(question.fieldName))
  ) {
    throw new WorkflowTriggerException(
      'User form step questions must have a field to save the answer to',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Every question in the Ask User Form step must have a field to save the answer to`,
      },
    );
  }

  const fieldNames = input.questions.map((question) => question.fieldName);

  // Two questions writing to one field would race, and only the last answer
  // would survive.
  if (fieldNames.length !== new Set(fieldNames).size) {
    throw new WorkflowTriggerException(
      'User form step questions must write to distinct fields',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Two questions in the Ask User Form step cannot be saved to the same field`,
      },
    );
  }

  if (!isNonEmptyString(input.objectName)) {
    throw new WorkflowTriggerException(
      'User form step must have an object to update',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User Form step must have an object to update`,
      },
    );
  }

  if (!isNonEmptyString(input.objectRecordId)) {
    throw new WorkflowTriggerException(
      'User form step must have a record to update',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Ask User Form step must have a record to update`,
      },
    );
  }
}
