import { FormFieldInput } from '@/object-record/record-field/ui/components/FormFieldInput';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { WorkflowFormFieldInput } from '@/workflow/workflow-steps/workflow-actions/components/WorkflowFormFieldInput';
import { isDefined } from 'twenty-shared/utils';

// Only what is needed to render the control. Kept narrower than the step
// settings so the workflow builder and the standalone prompt -- which gets its
// data from a DTO, not a step definition -- can share this component.
type WorkflowRequireFieldInputValue = {
  label: string;
  placeholder?: string;
  type: string;
  fieldMetadataId: string;
  value: unknown;
};

type WorkflowRequireFieldInputProps = {
  input: WorkflowRequireFieldInputValue;
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
  if (input.type === 'SELECT' || input.type === 'MULTI_SELECT') {
    if (!isDefined(input.fieldMetadataId)) {
      return null;
    }

    return (
      <WorkflowFormFieldInput
        fieldMetadataId={input.fieldMetadataId}
        defaultValue={input.value as never}
        readonly={readonly}
        onChange={onChange}
      />
    );
  }

  return (
    <FormFieldInput
      field={{
        label: input.label,
        // Carried as a plain string across the DTO boundary; FieldDefinition
        // wants the generated GraphQL enum. Same string values either way.
        type: input.type as FieldDefinition<FieldMetadata>['type'],
        metadata: {} as FieldMetadata,
      }}
      onChange={onChange}
      defaultValue={input.value as never}
      readonly={readonly}
      placeholder={input.placeholder}
      onError={onError}
    />
  );
};
