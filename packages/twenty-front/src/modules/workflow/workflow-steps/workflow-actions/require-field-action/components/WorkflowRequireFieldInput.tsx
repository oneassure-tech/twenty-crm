import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type WorkflowRequireFieldAction } from '@/workflow/types/Workflow';
import { WorkflowFormFieldInput } from '@/workflow/workflow-steps/workflow-actions/components/WorkflowFormFieldInput';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

type RequireFieldInput = WorkflowRequireFieldAction['settings']['input'];

type WorkflowRequireFieldInputProps = {
  input: RequireFieldInput;
  readonly: boolean;
  onChange: (value: unknown) => void;
  onError?: (error: string | undefined) => void;
};

// The single input a person fills for a REQUIRE_FIELD step.
//
// Kept separate from the filler so the side panel and the prompt modal render
// exactly the same control -- the two must not drift.
export const WorkflowRequireFieldInput = ({
  input,
  readonly,
  onChange,
  onError,
}: WorkflowRequireFieldInputProps) => {
  // SELECT and MULTI_SELECT need the real field metadata to know their options.
  if (
    input.type === FieldMetadataType.SELECT ||
    input.type === FieldMetadataType.MULTI_SELECT
  ) {
    if (!isDefined(input.fieldMetadataId)) {
      return null;
    }

    return (
      <WorkflowFormFieldInput
        fieldMetadataId={input.fieldMetadataId}
        defaultValue={input.value}
        readonly={readonly}
        onChange={onChange}
      />
    );
  }

  return (
    <FormFieldInput
      field={{
        label: input.label,
        // FieldDefinition's type comes from the generated GraphQL enum, which
        // is a separate declaration from the twenty-shared one used in the
        // schema. Same string values, so the bridge is safe.
        type: input.type as unknown as FieldDefinition<FieldMetadata>['type'],
        metadata: {} as FieldMetadata,
      }}
      onChange={onChange}
      defaultValue={input.value}
      readonly={readonly}
      placeholder={input.placeholder}
      onError={onError}
    />
  );
};
