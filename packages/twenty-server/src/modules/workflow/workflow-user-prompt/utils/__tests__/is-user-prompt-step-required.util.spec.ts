import { WorkflowActionType } from 'twenty-shared/workflow';

import {
  type WorkflowAction,
  type WorkflowUserFormAction,
  type WorkflowUserPromptAction,
} from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { isUserPromptStepRequired } from 'src/modules/workflow/workflow-user-prompt/utils/is-user-prompt-step-required.util';

const baseSettings = {
  outputSchema: {},
  errorHandlingOptions: {
    retryOnFailure: { value: false },
    continueOnFailure: { value: false },
  },
};

const buildPromptStep = (isRequired?: boolean): WorkflowUserPromptAction =>
  ({
    id: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    name: 'Ask User',
    type: WorkflowActionType.USER_PROMPT,
    valid: true,
    settings: {
      ...baseSettings,
      input: {
        question: 'Why is this lead not interested?',
        options: [
          {
            id: '20202020-0000-4000-8000-000000000001',
            label: 'Too expensive',
          },
        ],
        allowOtherOption: false,
        otherOptionLabel: 'Other',
        isRequired,
        objectName: 'lead',
        objectRecordId: '{{trigger.recordId}}',
        fieldName: 'notInterestedReason',
      },
    },
  }) as WorkflowUserPromptAction;

const buildFormStep = (questionsRequired: boolean[]): WorkflowUserFormAction =>
  ({
    id: '20202020-1c25-4d02-bf25-6aeccf7ea420',
    name: 'Ask User Form',
    type: WorkflowActionType.USER_FORM,
    valid: true,
    settings: {
      ...baseSettings,
      input: {
        questions: questionsRequired.map((isRequired, index) => ({
          id: `20202020-0000-4000-8000-00000000000${index}`,
          question: `Question ${index}`,
          fieldName: `field${index}`,
          isRequired,
        })),
        objectName: 'lead',
        objectRecordId: '{{trigger.recordId}}',
      },
    },
  }) as WorkflowUserFormAction;

describe('isUserPromptStepRequired', () => {
  it('should be required when the Ask User step is marked required', () => {
    expect(isUserPromptStepRequired(buildPromptStep(true))).toBe(true);
  });

  it('should not be required when the Ask User step is not marked required', () => {
    expect(isUserPromptStepRequired(buildPromptStep(false))).toBe(false);
  });

  // Steps built before the setting existed do not carry it at all.
  it('should not be required when the Ask User step predates the setting', () => {
    expect(isUserPromptStepRequired(buildPromptStep(undefined))).toBe(false);
  });

  it('should be required when any question of a form is required', () => {
    expect(isUserPromptStepRequired(buildFormStep([false, true]))).toBe(true);
  });

  it('should not be required when every question of a form is optional', () => {
    expect(isUserPromptStepRequired(buildFormStep([false, false]))).toBe(false);
  });

  it('should not be required for a step that asks nothing', () => {
    expect(
      isUserPromptStepRequired({
        id: '20202020-1c25-4d02-bf25-6aeccf7ea421',
        name: 'Send Email',
        type: WorkflowActionType.SEND_EMAIL,
        valid: true,
      } as WorkflowAction),
    ).toBe(false);
  });
});
