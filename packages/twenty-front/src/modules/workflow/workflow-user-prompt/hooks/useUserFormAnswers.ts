import { type UserFormQuestionField } from '@/workflow/workflow-user-prompt/utils/getUserFormQuestionFields';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { type JsonValue } from 'type-fest';

export type UserFormAnswers = Record<string, JsonValue>;

const isEmptyAnswer = (answer: JsonValue | undefined) => {
  if (!isDefined(answer)) {
    return true;
  }

  if (typeof answer === 'string') {
    return answer.trim().length === 0;
  }

  return Array.isArray(answer) && answer.length === 0;
};

export const useUserFormAnswers = ({
  questionFields,
  readonly = false,
  onSubmit,
}: {
  questionFields: UserFormQuestionField[];
  readonly?: boolean;
  onSubmit: (answers: UserFormAnswers) => void | Promise<void>;
}) => {
  const [answers, setAnswers] = useState<UserFormAnswers>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setAnswer = (fieldName: string, answer: JsonValue) => {
    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [fieldName]: answer,
    }));
  };

  // A typed input reports its own validation problems - a number field handed
  // letters, say - and an invalid answer must not be sent.
  const setFieldError = (fieldName: string, error: string | undefined) => {
    setFieldErrors((previousErrors) => {
      if (!isNonEmptyString(error)) {
        const { [fieldName]: _removedError, ...remainingErrors } =
          previousErrors;

        return remainingErrors;
      }

      return { ...previousErrors, [fieldName]: error };
    });
  };

  const hasAnsweredEveryRequiredQuestion = questionFields.every(
    ({ question }) =>
      !question.isRequired || !isEmptyAnswer(answers[question.fieldName]),
  );

  const canSubmit =
    !readonly &&
    questionFields.length > 0 &&
    hasAnsweredEveryRequiredQuestion &&
    Object.keys(fieldErrors).length === 0;

  const submit = () => {
    if (!canSubmit) {
      return;
    }

    // An unanswered optional question is left out entirely, so saving the form
    // never blanks a field the person did not touch.
    const answersToSubmit = Object.fromEntries(
      questionFields
        .map(({ question }) => [
          question.fieldName,
          answers[question.fieldName],
        ])
        .filter(([, answer]) => !isEmptyAnswer(answer as JsonValue)),
    ) as UserFormAnswers;

    void onSubmit(answersToSubmit);
  };

  return {
    answers,
    setAnswer,
    fieldErrors,
    setFieldError,
    canSubmit,
    submit,
  };
};
