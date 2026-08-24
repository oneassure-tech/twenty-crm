import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';

import { type WorkflowRequireFieldActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/require-field/types/workflow-require-field-action-settings.type';
import {
  WorkflowTriggerException,
  WorkflowTriggerExceptionCode,
} from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';

export function assertRequireFieldStepIsValid(
  settings: WorkflowRequireFieldActionSettings,
) {
  const input = settings.input;

  if (!input) {
    throw new WorkflowTriggerException(
      'No input provided in require field step',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_TRIGGER,
      {
        userFriendlyMessage: msg`No input provided in required field step`,
      },
    );
  }

  if (!isNonEmptyString(input.objectName)) {
    throw new WorkflowTriggerException(
      'Require field action must have an object',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Required field action must have an object selected`,
      },
    );
  }

  if (!isNonEmptyString(input.fieldName)) {
    throw new WorkflowTriggerException(
      'Require field action must have a field',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Required field action must have a field selected`,
      },
    );
  }

  if (!isNonEmptyString(input.objectRecordId)) {
    throw new WorkflowTriggerException(
      'Require field action must have a record',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Required field action must have a record selected`,
      },
    );
  }

  if (!isNonEmptyString(input.label)) {
    throw new WorkflowTriggerException(
      'Require field action must have a label',
      WorkflowTriggerExceptionCode.INVALID_WORKFLOW_VERSION,
      {
        userFriendlyMessage: msg`Required field action must have a label to show the person filling it`,
      },
    );
  }
}
