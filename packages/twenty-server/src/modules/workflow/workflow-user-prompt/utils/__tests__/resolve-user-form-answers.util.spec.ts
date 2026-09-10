import { WorkflowActionType } from 'twenty-shared/workflow';

import { WorkflowVersionStepException } from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { type WorkflowUserFormAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';
import { resolveUserFormAnswers } from 'src/modules/workflow/workflow-user-prompt/utils/resolve-user-form-answers.util';

const buildStep = (
  questions: WorkflowUserFormAction['settings']['input']['questions'],
): WorkflowUserFormAction =>
  ({
    id: '20202020-1c25-4d02-bf25-6aeccf7ea419',
    name: 'Ask User Form',
    type: WorkflowActionType.USER_FORM,
    valid: true,
    settings: {
      input: {
        questions,
        objectName: 'lead',
        objectRecordId: '{{trigger.recordId}}',
      },
      outputSchema: {},
      errorHandlingOptions: {
        retryOnFailure: { value: false },
        continueOnFailure: { value: false },
      },
    },
  }) as WorkflowUserFormAction;

const requiredDemoDate = {
  id: 'ec3a6d64-2a0a-4d1e-a6de-9a1b9b0cc2a0',
  question: 'When is the demo scheduled?',
  fieldName: 'demoDate',
  isRequired: true,
};

const optionalSeatCount = {
  id: '2ba1d4ee-6a1e-4a6f-9dcb-3ec4c6d8bd11',
  question: 'How many seats do they need?',
  fieldName: 'seatCount',
  isRequired: false,
};

describe('resolveUserFormAnswers', () => {
  it('should keep every answered question', () => {
    const answers = resolveUserFormAnswers({
      step: buildStep([requiredDemoDate, optionalSeatCount]),
      answers: { demoDate: '2026-09-10T09:00:00.000Z', seatCount: 12 },
    });

    expect(answers).toEqual({
      demoDate: '2026-09-10T09:00:00.000Z',
      seatCount: 12,
    });
  });

  it('should leave out an optional question that was not answered', () => {
    const answers = resolveUserFormAnswers({
      step: buildStep([requiredDemoDate, optionalSeatCount]),
      answers: { demoDate: '2026-09-10T09:00:00.000Z', seatCount: null },
    });

    expect(answers).toEqual({ demoDate: '2026-09-10T09:00:00.000Z' });
  });

  it('should treat a blank string as no answer', () => {
    const answers = resolveUserFormAnswers({
      step: buildStep([optionalSeatCount]),
      answers: { seatCount: '   ' },
    });

    expect(answers).toEqual({});
  });

  it('should keep a false answer, which is a real answer', () => {
    const answers = resolveUserFormAnswers({
      step: buildStep([{ ...optionalSeatCount, fieldName: 'isQualified' }]),
      answers: { isQualified: false },
    });

    expect(answers).toEqual({ isQualified: false });
  });

  it('should throw when a required question was left unanswered', () => {
    expect(() =>
      resolveUserFormAnswers({
        step: buildStep([requiredDemoDate]),
        answers: {},
      }),
    ).toThrow(WorkflowVersionStepException);
  });

  it('should throw when an answer targets a field the step does not ask about', () => {
    expect(() =>
      resolveUserFormAnswers({
        step: buildStep([requiredDemoDate]),
        answers: {
          demoDate: '2026-09-10T09:00:00.000Z',
          amountPaid: 100000,
        },
      }),
    ).toThrow(WorkflowVersionStepException);
  });
});
