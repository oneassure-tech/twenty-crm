import { type WorkflowUserPromptActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/types/workflow-user-prompt-action-settings.type';
import { WorkflowTriggerException } from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';
import { assertUserPromptStepIsValid } from 'src/modules/workflow/workflow-trigger/utils/assert-user-prompt-step-is-valid.util';

const buildSettings = (
  overrides: Partial<WorkflowUserPromptActionSettings['input']> = {},
): WorkflowUserPromptActionSettings => ({
  input: {
    question: 'Why is this lead not interested?',
    options: [
      { id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0', label: 'Too expensive' },
      { id: '2ba1d4ee-6a1e-4a6f-9dcb-3ec4c6d8bd11', label: 'Went elsewhere' },
    ],
    allowOtherOption: true,
    otherOptionLabel: 'Other',
    objectName: 'lead',
    objectRecordId: '{{trigger.recordId}}',
    fieldName: 'notInterestedReason',
    ...overrides,
  },
  outputSchema: {},
  errorHandlingOptions: {
    retryOnFailure: { value: false },
    continueOnFailure: { value: false },
  },
});

describe('assertUserPromptStepIsValid', () => {
  it('should not throw when the step is fully configured', () => {
    expect(() => assertUserPromptStepIsValid(buildSettings())).not.toThrow();
  });

  it('should throw when the question is empty', () => {
    expect(() =>
      assertUserPromptStepIsValid(buildSettings({ question: '' })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when there is no option to choose from', () => {
    expect(() =>
      assertUserPromptStepIsValid(buildSettings({ options: [] })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when an option has no label', () => {
    expect(() =>
      assertUserPromptStepIsValid(
        buildSettings({
          options: [
            { id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0', label: '' },
          ],
        }),
      ),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when two options share the same label', () => {
    expect(() =>
      assertUserPromptStepIsValid(
        buildSettings({
          options: [
            {
              id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
              label: 'Too expensive',
            },
            {
              id: '2ba1d4ee-6a1e-4a6f-9dcb-3ec4c6d8bd11',
              label: 'Too expensive',
            },
          ],
        }),
      ),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when no field is chosen to save the answer to', () => {
    expect(() =>
      assertUserPromptStepIsValid(buildSettings({ fieldName: '' })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when no object is chosen', () => {
    expect(() =>
      assertUserPromptStepIsValid(buildSettings({ objectName: '' })),
    ).toThrow(WorkflowTriggerException);
  });

  it('should throw when there is no record to update', () => {
    expect(() =>
      assertUserPromptStepIsValid(buildSettings({ objectRecordId: '' })),
    ).toThrow(WorkflowTriggerException);
  });
});
