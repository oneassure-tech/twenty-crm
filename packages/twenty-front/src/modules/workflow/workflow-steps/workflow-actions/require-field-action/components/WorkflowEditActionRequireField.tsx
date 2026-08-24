import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectMetadataSelectHelpers } from '@/object-metadata/hooks/useObjectMetadataSelectHelpers';
import { FormFieldInputContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputContainer';
import { FormSingleRecordPicker } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordPicker';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { InputLabel } from '@/ui/input/components/InputLabel';
import { Select } from '@/ui/input/components/Select';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { type WorkflowRequireFieldAction } from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { shouldDisplayFormField } from '@/workflow/workflow-steps/workflow-actions/utils/shouldDisplayFormField';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { t } from '@lingui/core/macro';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { canObjectBeManagedByAutomation } from 'twenty-shared/workflow';
import { type SelectOption } from 'twenty-ui/input';
import { HorizontalSeparator } from 'twenty-ui/layout';
import { useDebouncedCallback } from 'use-debounce';

type RequireFieldFormData = WorkflowRequireFieldAction['settings']['input'];

type WorkflowEditActionRequireFieldProps = {
  action: WorkflowRequireFieldAction;
  actionOptions:
    | {
        readonly: true;
      }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowRequireFieldAction) => void;
      };
};

export const WorkflowEditActionRequireField = ({
  action,
  actionOptions,
}: WorkflowEditActionRequireFieldProps) => {
  const { getSelectIconPropsFromObjectMetadataItem } =
    useObjectMetadataSelectHelpers();
  const { activeNonSystemObjectMetadataItems } =
    useFilteredObjectMetadataItems();

  const [formData, setFormData] = useState<RequireFieldFormData>(
    action.settings.input,
  );

  const isFormDisabled = actionOptions.readonly === true;

  const availableMetadata: Array<SelectOption<string>> =
    activeNonSystemObjectMetadataItems
      .filter((objectMetadataItem) =>
        canObjectBeManagedByAutomation({
          nameSingular: objectMetadataItem.nameSingular,
        }),
      )
      .map((item) => ({
        label: item.labelPlural,
        value: item.nameSingular,
        ...getSelectIconPropsFromObjectMetadataItem(item),
      }));

  const selectedObjectMetadataItem = activeNonSystemObjectMetadataItems.find(
    (item) => item.nameSingular === formData.objectName,
  );

  const availableFields: Array<SelectOption<string>> = isDefined(
    selectedObjectMetadataItem,
  )
    ? selectedObjectMetadataItem.fields
        .filter((fieldMetadataItem) =>
          shouldDisplayFormField({
            fieldMetadataItem,
            actionType: 'REQUIRE_FIELD',
          }),
        )
        .sort((fieldA, fieldB) => fieldA.label.localeCompare(fieldB.label))
        .map((fieldMetadataItem) => ({
          label: fieldMetadataItem.label,
          value: fieldMetadataItem.name,
        }))
    : [];

  const saveAction = useDebouncedCallback(
    async (updatedFormData: RequireFieldFormData) => {
      if (actionOptions.readonly === true) {
        return;
      }

      actionOptions.onActionUpdate({
        ...action,
        settings: {
          ...action.settings,
          input: updatedFormData,
        },
      });
    },
    1_000,
  );

  useEffect(() => {
    return () => {
      saveAction.flush();
    };
  }, [saveAction]);

  const updateFormData = (partial: Partial<RequireFieldFormData>) => {
    const newFormData = { ...formData, ...partial };

    setFormData(newFormData);
    saveAction(newFormData);
  };

  return (
    <>
      <WorkflowStepBody>
        <Select
          dropdownId="workflow-require-field-object-name"
          label={t`Object`}
          fullWidth
          disabled={isFormDisabled}
          value={formData.objectName}
          emptyOption={{ label: t`Select an option`, value: '' }}
          options={availableMetadata}
          onChange={(updatedObjectName) => {
            // The field, its metadata id and its type all belong to the
            // previous object, so they have to be cleared together.
            updateFormData({
              objectName: updatedObjectName,
              fieldName: '',
              fieldMetadataId: '',
            });
          }}
          withSearchInput
          dropdownOffset={{ y: 4 }}
          dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
        />

        <HorizontalSeparator noMargin />

        {isDefined(selectedObjectMetadataItem) && (
          <FormSingleRecordPicker
            testId="workflow-require-field-object-record-id"
            label={t`Record`}
            onChange={(objectRecordId) => updateFormData({ objectRecordId })}
            objectNameSingulars={[selectedObjectMetadataItem.nameSingular]}
            defaultValue={formData.objectRecordId}
            disabled={isFormDisabled}
            VariablePicker={WorkflowVariablePicker}
          />
        )}

        {isDefined(selectedObjectMetadataItem) && (
          <Select
            dropdownId="workflow-require-field-field-name"
            label={t`Field`}
            fullWidth
            disabled={isFormDisabled}
            value={formData.fieldName}
            emptyOption={{ label: t`Select an option`, value: '' }}
            options={availableFields}
            onChange={(updatedFieldName) => {
              const fieldMetadataItem = selectedObjectMetadataItem.fields.find(
                (field) => field.name === updatedFieldName,
              );

              if (!isDefined(fieldMetadataItem)) {
                return;
              }

              updateFormData({
                fieldName: updatedFieldName,
                fieldMetadataId: fieldMetadataItem.id,
                // Persisted so the run-time input can be rendered without
                // re-reading object metadata. The cast bridges the generated
                // GraphQL FieldMetadataType and the twenty-shared one, which
                // are distinct enums with identical string values.
                type: fieldMetadataItem.type as unknown as RequireFieldFormData['type'],
                label: formData.label || fieldMetadataItem.label,
              });
            }}
            withSearchInput
            dropdownOffset={{ y: 4 }}
            dropdownWidth={GenericDropdownContentWidth.ExtraLarge}
          />
        )}

        <HorizontalSeparator noMargin />

        <FormFieldInputContainer>
          <InputLabel>{t`Label`}</InputLabel>
          <FormTextFieldInput
            onChange={(label: string) => updateFormData({ label })}
            defaultValue={formData.label}
            placeholder={t`Question shown to the person filling this in`}
            readonly={isFormDisabled}
          />
        </FormFieldInputContainer>

        <FormFieldInputContainer>
          <InputLabel>{t`Placeholder`}</InputLabel>
          <FormTextFieldInput
            onChange={(placeholder: string) => updateFormData({ placeholder })}
            defaultValue={formData.placeholder}
            placeholder={t`Optional hint text`}
            readonly={isFormDisabled}
          />
        </FormFieldInputContainer>
      </WorkflowStepBody>
      {!isFormDisabled && <WorkflowStepFooter stepId={action.id} />}
    </>
  );
};
