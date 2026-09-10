import { type WorkflowUserFormActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/types/workflow-user-form-action-settings.type';
import { WorkflowTriggerException } from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';
import { assertUserFormStepIsValid } from 'src/modules/workflow/workflow-trigger/utils/assert-user-form-step-is-valid.util';

const buildSettings = (
  overrides: Partial<WorkflowUserFormActionSettings['input']> = {},
): WorkflowUserFormActionSettings => ({
  input: {
    questions: [
      {
        id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
        question: 'When is the demo scheduled?',
        fieldName: 'demoDate',
        isRequired: true,
      },
      {
        id: '2ba1d4ee-6a1e-4a6f-9dcb-3ec4c6d8bd11',
        question: 'How many seats do they need?',
        fieldName: 'seatCount',
        isRequired: false,
      },
    ],
    objectName: 'lead',
    objectRecordId: '{{trigger.recordId}}',
    ...overrides,
  },
  outputSchema: {},
  errorHandlingOptions: {
    retryOnFailure: { value: false },
    continueOnFailure: { value: false },
  },
});

describe('assertUserFormStepIsValid', () => {
  it('should not throw when the step is fully configured', () => {
    expect(() => assertUserFormStepIsValid(buildSettings())).not.toThrow();
  });

  it('should throw when there is no question to ask', () => {
    expect(() =>
      assertUserFormStepIsValid(buildSettings({ questions: [] })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when a question is empty', () => {
    expect(() =>
      assertUserFormStepIsValid(
        buildSettings({
          questions: [
            {
              id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
              question: '',
              fieldName: 'demoDate',
              isRequired: true,
            },
          ],
        }),
      ),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when a question has no field to save the answer to', () => {
    expect(() =>
      assertUserFormStepIsValid(
        buildSettings({
          questions: [
            {
              id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
              question: 'When is the demo scheduled?',
              fieldName: '',
              isRequired: true,
            },
          ],
        }),
      ),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when two questions are saved to the same field', () => {
    expect(() =>
      assertUserFormStepIsValid(
        buildSettings({
          questions: [
            {
              id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
              question: 'When is the demo scheduled?',
              fieldName: 'demoDate',
              isRequired: true,
            },
            {
              id: '2ba1d4ee-6a1e-4a6f-9dcb-3ec4c6d8bd11',
              question: 'When was it rescheduled to?',
              fieldName: 'demoDate',
              isRequired: false,
            },
          ],
        }),
      ),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when no object is chosen', () => {
    expect(() =>
      assertUserFormStepIsValid(buildSettings({ objectName: '' })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when no record to update is given', () => {
    expect(() =>
      assertUserFormStepIsValid(buildSettings({ objectRecordId: '' })),
    ).toThrow(WorkflowTriggerException);
  });
});
