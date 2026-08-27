import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectMetadataSelectHelpers } from '@/object-metadata/hooks/useObjectMetadataSelectHelpers';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { FormBooleanFieldToggleInput } from '@/object-record/record-field/ui/form-types/components/FormBooleanFieldToggleInput';
import { FormFieldInputContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputContainer';
import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { InputLabel } from '@/ui/input/components/InputLabel';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { splitWorkflowTriggerEventName } from '@/workflow/utils/splitWorkflowTriggerEventName';
import {
  type WorkflowTrigger,
  type WorkflowUserPromptAction,
} from '@/workflow/types/Workflow';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { type OnDragEndResponder } from '@hello-pangea/dnd';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { canObjectBeManagedByAutomation } from 'twenty-shared/workflow';
import { Callout } from 'twenty-ui/feedback';
import { IconGripVertical, IconPlus, IconTrash } from 'twenty-ui/icon';
import { Button, LightIconButton, type SelectOption } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useDebouncedCallback } from 'use-debounce';
import { v4 } from 'uuid';

type UserPromptInput = WorkflowUserPromptAction['settings']['input'];

export type WorkflowEditActionUserPromptProps = {
  trigger: WorkflowTrigger | null;
  action: WorkflowUserPromptAction;
  actionOptions:
    | {
        readonly: true;
      }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowUserPromptAction) => void;
      };
};

const StyledOptionRow = styled.div`
  align-items: center;
  column-gap: ${themeCssVariables.spacing[1]};
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  margin-bottom: ${themeCssVariables.spacing[2]};
`;

const StyledOptionInputWrapper = styled.div`
  min-width: 0;
`;

const StyledAddOptionContainer = styled.div`
  display: flex;
  justify-content: flex-start;
`;

export const WorkflowEditActionUserPrompt = ({
  trigger,
  action,
  actionOptions,
}: WorkflowEditActionUserPromptProps) => {
  const { t } = useLingui();
  const { getSelectIconPropsFromObjectMetadataItem } =
    useObjectMetadataSelectHelpers();
  const { activeNonSystemObjectMetadataItems } =
    useFilteredObjectMetadataItems();

  // A database-event workflow already knows which object it watches and which
  // record fired it, so the step defaults to both rather than making the
  // author wire them up by hand.
  const { objectType: triggerObjectNameSingular, event: triggerEvent } =
    trigger?.type === 'DATABASE_EVENT' && isDefined(trigger.settings.eventName)
      ? splitWorkflowTriggerEventName(trigger.settings.eventName)
      : { objectType: undefined, event: undefined };

  // The trigger's output schema exposes the record under properties.after (or
  // properties.before for deletions), so the variable has to be written that
  // way - {{trigger.recordId}} resolves at run time but shows as "Not Found"
  // in the builder because it is not part of that schema.
  const triggerRecordIdVariable = isDefined(triggerEvent)
    ? triggerEvent === 'deleted' || triggerEvent === 'destroyed'
      ? '{{trigger.properties.before.id}}'
      : '{{trigger.properties.after.id}}'
    : '';

  const [formData, setFormData] = useState<UserPromptInput>({
    ...action.settings.input,
    objectName:
      action.settings.input.objectName || (triggerObjectNameSingular ?? ''),
    objectRecordId:
      action.settings.input.objectRecordId === '' ||
      // Replace the server-side placeholder with the schema-backed path.
      action.settings.input.objectRecordId === '{{trigger.recordId}}'
        ? triggerRecordIdVariable
        : action.settings.input.objectRecordId,
  });

  const isFormDisabled = actionOptions.readonly === true;

  const saveAction = useDebouncedCallback(
    async (updatedInput: UserPromptInput) => {
      if (actionOptions.readonly === true) {
        return;
      }

      actionOptions.onActionUpdate({
        ...action,
        settings: {
          ...action.settings,
          input: updatedInput,
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

  const updateFormData = (partialInput: Partial<UserPromptInput>) => {
    if (isFormDisabled) {
      return;
    }

    const updatedInput = { ...formData, ...partialInput };

    setFormData(updatedInput);
    saveAction(updatedInput);
  };

  const objectOptions: SelectOption<string>[] =
    activeNonSystemObjectMetadataItems
      .filter((objectMetadataItem) =>
        canObjectBeManagedByAutomation({
          nameSingular: objectMetadataItem.nameSingular,
        }),
      )
      .map((objectMetadataItem) => ({
        label: objectMetadataItem.labelPlural,
        value: objectMetadataItem.nameSingular,
        ...getSelectIconPropsFromObjectMetadataItem(objectMetadataItem),
      }));

  const selectedObjectMetadataItem = activeNonSystemObjectMetadataItems.find(
    (objectMetadataItem) =>
      objectMetadataItem.nameSingular === formData.objectName,
  );

  // Both a chosen option and a typed "Other" answer are written to this one
  // field, so only TEXT fields can hold the result.
  const textFieldOptions: SelectOption<string>[] = (
    selectedObjectMetadataItem?.fields ?? []
  )
    .filter(
      (field) =>
        field.isActive &&
        !isHiddenSystemField(field) &&
        field.type === FieldMetadataType.TEXT,
    )
    .map((field) => ({ label: field.label, value: field.name }));

  const handleOptionDragEnd: OnDragEndResponder = ({
    source,
    destination,
  }) => {
    const movedOption = formData.options.at(source.index);

    if (!isDefined(movedOption) || !isDefined(destination)) {
      return;
    }

    const reorderedOptions = [...formData.options];

    reorderedOptions.splice(source.index, 1);
    reorderedOptions.splice(destination.index, 0, movedOption);

    updateFormData({ options: reorderedOptions });
  };

  return (
    <>
      <WorkflowStepBody>
        <FormTextFieldInput
          label={t`Question`}
          placeholder={t`Why is this lead not interested?`}
          defaultValue={formData.question}
          onChange={(question) => updateFormData({ question })}
          readonly={isFormDisabled}
          VariablePicker={WorkflowVariablePicker}
        />

        <FormFieldInputContainer>
          <InputLabel>{t`Options`}</InputLabel>

          {formData.options.length === 0 && (
            <Callout
              variant="neutral"
              isClosable={false}
              title={t`Add the options to choose from`}
              description={t`When this step runs, the person who triggered the workflow is asked to pick exactly one of these options. They cannot dismiss the question.`}
            />
          )}

          <DraggableList
            onDragEnd={handleOptionDragEnd}
            draggableItems={formData.options.map((option, index) => (
              <DraggableItem
                key={option.id}
                draggableId={option.id}
                index={index}
                isDragDisabled={isFormDisabled}
                isInsideScrollableContainer
                disableDraggingBackground
                itemComponent={() => (
                  <StyledOptionRow>
                    {isFormDisabled ? (
                      <div />
                    ) : (
                      <LightIconButton
                        Icon={IconGripVertical}
                        aria-label={t`Reorder option`}
                      />
                    )}

                    <StyledOptionInputWrapper>
                      <FormTextFieldInput
                        placeholder={t`Option ${index + 1}`}
                        defaultValue={option.label}
                        onChange={(label) =>
                          updateFormData({
                            options: formData.options.map((currentOption) =>
                              currentOption.id === option.id
                                ? { ...currentOption, label }
                                : currentOption,
                            ),
                          })
                        }
                        readonly={isFormDisabled}
                      />
                    </StyledOptionInputWrapper>

                    {isFormDisabled ? (
                      <div />
                    ) : (
                      <LightIconButton
                        Icon={IconTrash}
                        aria-label={t`Delete option`}
                        onClick={() =>
                          updateFormData({
                            options: formData.options.filter(
                              (currentOption) => currentOption.id !== option.id,
                            ),
                          })
                        }
                      />
                    )}
                  </StyledOptionRow>
                )}
              />
            ))}
          />

          {!isFormDisabled && (
            <StyledAddOptionContainer>
              <Button
                Icon={IconPlus}
                title={t`Add option`}
                variant="secondary"
                size="small"
                onClick={() =>
                  updateFormData({
                    options: [...formData.options, { id: v4(), label: '' }],
                  })
                }
              />
            </StyledAddOptionContainer>
          )}
        </FormFieldInputContainer>

        <FormBooleanFieldToggleInput
          description={t`Allow a typed answer`}
          value={formData.allowOtherOption}
          onChange={(allowOtherOption) => updateFormData({ allowOtherOption })}
          disabled={isFormDisabled}
          hint={t`Adds a last choice that reveals a text box, so the user can answer when none of the options fit.`}
        />

        {formData.allowOtherOption && (
          <FormTextFieldInput
            label={t`Label of the typed choice`}
            placeholder={t`Other`}
            defaultValue={formData.otherOptionLabel}
            onChange={(otherOptionLabel) =>
              updateFormData({ otherOptionLabel })
            }
            readonly={isFormDisabled}
          />
        )}

        <FormSelectFieldInput
          label={t`Object`}
          // Without this an unset value silently renders the first option, so
          // the step looks configured while nothing is actually saved.
          isNullable
          defaultValue={formData.objectName}
          options={objectOptions}
          onChange={(objectName) => {
            if (objectName === null) {
              return;
            }

            // The previously chosen field belongs to the previous object.
            updateFormData({ objectName, fieldName: '' });
          }}
          readonly={isFormDisabled}
        />

        <FormSelectFieldInput
          label={t`Save answer to`}
          hint={t`Only text fields can be used, because a typed answer is saved to this same field.`}
          // Without this an unset value silently renders the first option, so
          // the step looks configured while nothing is actually saved.
          isNullable
          defaultValue={formData.fieldName}
          options={textFieldOptions}
          onChange={(fieldName) => {
            if (fieldName === null) {
              return;
            }

            updateFormData({ fieldName });
          }}
          readonly={isFormDisabled}
        />

        <FormTextFieldInput
          label={t`Record to update`}
          placeholder={t`{{trigger.recordId}}`}
          defaultValue={formData.objectRecordId}
          onChange={(objectRecordId) => updateFormData({ objectRecordId })}
          readonly={isFormDisabled}
          VariablePicker={WorkflowVariablePicker}
        />
      </WorkflowStepBody>
      {!isFormDisabled && <WorkflowStepFooter stepId={action.id} />}
    </>
  );
};
