import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { type UserFormAnswers } from '@/workflow/workflow-user-prompt/hooks/useUserFormAnswers';
import { type UserFormQuestionField } from '@/workflow/workflow-user-prompt/utils/getUserFormQuestionFields';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { type JsonValue } from 'type-fest';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export type WorkflowUserFormAnswerFormProps = {
  questionFields: UserFormQuestionField[];
  answers: UserFormAnswers;
  onAnswerChange: (fieldName: string, answer: JsonValue) => void;
  onFieldError: (fieldName: string, error: string | undefined) => void;
  readonly?: boolean;
};

const StyledQuestions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.md};
  margin: 0;
`;

export const WorkflowUserFormAnswerForm = ({
  questionFields,
  answers,
  onAnswerChange,
  onFieldError,
  readonly = false,
}: WorkflowUserFormAnswerFormProps) => {
  const { t } = useLingui();

  if (questionFields.length === 0) {
    return (
      <StyledEmptyState>
        {t`The fields this form asks about are no longer available.`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledQuestions>
      {questionFields.map(({ question, fieldDefinition }) => (
        <FormFieldInput
          key={question.id}
          // The question replaces the field's own label: it is what the person
          // is being asked, and the field it lands in is an implementation
          // detail of the workflow.
          field={{ ...fieldDefinition, label: question.question }}
          defaultValue={answers[question.fieldName] ?? null}
          onChange={(answer) => onAnswerChange(question.fieldName, answer)}
          onError={(error) => onFieldError(question.fieldName, error)}
          readonly={readonly}
        />
      ))}
    </StyledQuestions>
  );
};
