import { FormBooleanFieldToggleInput } from '@/object-record/record-field/ui/form-types/components/FormBooleanFieldToggleInput';
import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { type WorkflowUserFormAction } from '@/workflow/types/Workflow';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconGripVertical, IconTrash } from 'twenty-ui/icon';
import { LightIconButton, type SelectOption } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type UserFormQuestion =
  WorkflowUserFormAction['settings']['input']['questions'][number];

export type WorkflowEditActionUserFormQuestionProps = {
  question: UserFormQuestion;
  index: number;
  fieldOptions: SelectOption<string>[];
  readonly: boolean;
  onChange: (partialQuestion: Partial<UserFormQuestion>) => void;
  onDelete: () => void;
};

const StyledQuestionCard = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledQuestionHeader = styled.div`
  align-items: center;
  column-gap: ${themeCssVariables.spacing[1]};
  display: grid;
  grid-template-columns: 20px 1fr 20px;
`;

const StyledQuestionInputWrapper = styled.div`
  min-width: 0;
`;

export const WorkflowEditActionUserFormQuestion = ({
  question,
  index,
  fieldOptions,
  readonly,
  onChange,
  onDelete,
}: WorkflowEditActionUserFormQuestionProps) => {
  const { t } = useLingui();

  return (
    <StyledQuestionCard>
      <StyledQuestionHeader>
        {readonly ? (
          <div />
        ) : (
          <LightIconButton
            Icon={IconGripVertical}
            aria-label={t`Reorder question`}
          />
        )}

        <StyledQuestionInputWrapper>
          <FormTextFieldInput
            placeholder={t`Question ${index + 1}`}
            defaultValue={question.question}
            onChange={(questionText) => onChange({ question: questionText })}
            readonly={readonly}
          />
        </StyledQuestionInputWrapper>

        {readonly ? (
          <div />
        ) : (
          <LightIconButton
            Icon={IconTrash}
            aria-label={t`Delete question`}
            onClick={onDelete}
          />
        )}
      </StyledQuestionHeader>

      <FormSelectFieldInput
        label={t`Save answer to`}
        // Without this an unset value silently renders the first option, so
        // the question looks configured while nothing is actually saved.
        isNullable
        defaultValue={question.fieldName}
        options={fieldOptions}
        onChange={(fieldName) => {
          if (fieldName === null) {
            return;
          }

          onChange({ fieldName });
        }}
        readonly={readonly}
      />

      <FormBooleanFieldToggleInput
        description={t`Required`}
        value={question.isRequired}
        onChange={(isRequired) => onChange({ isRequired })}
        disabled={readonly}
        hint={t`The form cannot be saved until this question is answered. An optional question left blank leaves its field untouched.`}
      />
    </StyledQuestionCard>
  );
};
