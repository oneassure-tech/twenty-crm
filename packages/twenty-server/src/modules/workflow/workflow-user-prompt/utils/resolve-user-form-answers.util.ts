import { msg } from '@lingui/core/macro';
import { type FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { isUserFormAnswerEmpty } from 'twenty-shared/workflow';

import {
  WorkflowVersionStepException,
  WorkflowVersionStepExceptionCode,
} from 'src/modules/workflow/common/exceptions/workflow-version-step.exception';
import { type WorkflowUserFormAction } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action.type';

export const resolveUserFormAnswers = ({
  step,
  answers,
  fieldTypeByFieldName,
}: {
  step: WorkflowUserFormAction;
  answers: Record<string, unknown>;
  fieldTypeByFieldName: Record<string, FieldMetadataType>;
}): Record<string, unknown> => {
  const isEmptyAnswer = (fieldName: string, answer: unknown) =>
    isUserFormAnswerEmpty({
      fieldType: fieldTypeByFieldName[fieldName],
      answer,
    });

  const { questions } = step.settings.input;
  const askedFieldNames = new Set(
    questions.map((question) => question.fieldName),
  );

  // The step decides which fields it may write. Anything else in the payload
  // is refused rather than ignored, so a crafted answer cannot reach a field
  // the workflow author never exposed.
  const unknownFieldName = Object.keys(answers).find(
    (fieldName) => !askedFieldNames.has(fieldName),
  );

  if (isDefined(unknownFieldName)) {
    throw new WorkflowVersionStepException(
      `Answer given for a field this step does not ask about: "${unknownFieldName}"`,
      WorkflowVersionStepExceptionCode.INVALID_REQUEST,
      {
        userFriendlyMessage: msg`This form cannot save an answer to that field`,
      },
    );
  }

  const missingRequiredQuestion = questions.find(
    (question) =>
      question.isRequired &&
      isEmptyAnswer(question.fieldName, answers[question.fieldName]),
  );

  if (isDefined(missingRequiredQuestion)) {
    throw new WorkflowVersionStepException(
      `Required question left unanswered: "${missingRequiredQuestion.question}"`,
      WorkflowVersionStepExceptionCode.INVALID_REQUEST,
      {
        userFriendlyMessage: msg`Please answer every required question`,
      },
    );
  }

  // An unanswered optional question leaves its field alone rather than
  // blanking whatever is already on the record.
  return Object.fromEntries(
    Object.entries(answers).filter(
      ([fieldName, answer]) => !isEmptyAnswer(fieldName, answer),
    ),
  );
};
