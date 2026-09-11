import { type UserFormQuestionField } from '@/workflow/workflow-user-prompt/utils/getUserFormQuestionFields';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { isUserFormAnswerEmpty } from 'twenty-shared/workflow';
import { type JsonValue } from 'type-fest';

export type UserFormAnswers = Record<string, JsonValue>;

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

  const isAnswered = ({ question, fieldDefinition }: UserFormQuestionField) =>
    !isUserFormAnswerEmpty({
      fieldType: fieldDefinition.type,
      answer: answers[question.fieldName],
    });

  const hasAnsweredEveryRequiredQuestion = questionFields.every(
    (questionField) =>
      !questionField.question.isRequired || isAnswered(questionField),
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
    const answersToSubmit: UserFormAnswers = Object.fromEntries(
      questionFields
        .filter(isAnswered)
        .map(({ question }) => [
          question.fieldName,
          answers[question.fieldName],
        ]),
    );

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
