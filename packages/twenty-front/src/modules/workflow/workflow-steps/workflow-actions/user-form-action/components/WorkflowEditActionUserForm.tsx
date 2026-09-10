import { useFilteredObjectMetadataItems } from '@/object-metadata/hooks/useFilteredObjectMetadataItems';
import { useObjectMetadataSelectHelpers } from '@/object-metadata/hooks/useObjectMetadataSelectHelpers';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { FormFieldInputContainer } from '@/object-record/record-field/ui/form-types/components/FormFieldInputContainer';
import { FormSelectFieldInput } from '@/object-record/record-field/ui/form-types/components/FormSelectFieldInput';
import { FormTextFieldInput } from '@/object-record/record-field/ui/form-types/components/FormTextFieldInput';
import { InputLabel } from '@/ui/input/components/InputLabel';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import {
  type WorkflowTrigger,
  type WorkflowUserFormAction,
} from '@/workflow/types/Workflow';
import { splitWorkflowTriggerEventName } from '@/workflow/utils/splitWorkflowTriggerEventName';
import { WorkflowStepBody } from '@/workflow/workflow-steps/components/WorkflowStepBody';
import { WorkflowStepFooter } from '@/workflow/workflow-steps/components/WorkflowStepFooter';
import { WorkflowEditActionUserFormQuestion } from '@/workflow/workflow-steps/workflow-actions/user-form-action/components/WorkflowEditActionUserFormQuestion';
import { USER_FORM_SUPPORTED_FIELD_TYPES } from '@/workflow/workflow-steps/workflow-actions/user-form-action/constants/UserFormSupportedFieldTypes';
import { WorkflowVariablePicker } from '@/workflow/workflow-variables/components/WorkflowVariablePicker';
import { type OnDragEndResponder } from '@hello-pangea/dnd';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { canObjectBeManagedByAutomation } from 'twenty-shared/workflow';
import { Callout } from 'twenty-ui/feedback';
import { IconPlus } from 'twenty-ui/icon';
import { Button, type SelectOption } from 'twenty-ui/input';
import { useDebouncedCallback } from 'use-debounce';
import { v4 } from 'uuid';

type UserFormInput = WorkflowUserFormAction['settings']['input'];

export type WorkflowEditActionUserFormProps = {
  trigger: WorkflowTrigger | null;
  action: WorkflowUserFormAction;
  actionOptions:
    | {
        readonly: true;
      }
    | {
        readonly?: false;
        onActionUpdate: (action: WorkflowUserFormAction) => void;
      };
};

const StyledAddQuestionContainer = styled.div`
  display: flex;
  justify-content: flex-start;
`;

export const WorkflowEditActionUserForm = ({
  trigger,
  action,
  actionOptions,
}: WorkflowEditActionUserFormProps) => {
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

  const [formData, setFormData] = useState<UserFormInput>({
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
    async (updatedInput: UserFormInput) => {
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

  const updateFormData = (partialInput: Partial<UserFormInput>) => {
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

  const fieldOptions: SelectOption<string>[] = (
    selectedObjectMetadataItem?.fields ?? []
  )
    .filter(
      (field) =>
        field.isActive &&
        !isHiddenSystemField(field) &&
        USER_FORM_SUPPORTED_FIELD_TYPES.includes(field.type),
    )
    .map((field) => ({ label: field.label, value: field.name }));

  const handleQuestionDragEnd: OnDragEndResponder = ({
    source,
    destination,
  }) => {
    const movedQuestion = formData.questions.at(source.index);

    if (!isDefined(movedQuestion) || !isDefined(destination)) {
      return;
    }

    const reorderedQuestions = [...formData.questions];

    reorderedQuestions.splice(source.index, 1);
    reorderedQuestions.splice(destination.index, 0, movedQuestion);

    updateFormData({ questions: reorderedQuestions });
  };

  return (
    <>
      <WorkflowStepBody>
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

            // The chosen fields belong to the previous object.
            updateFormData({
              objectName,
              questions: formData.questions.map((question) => ({
                ...question,
                fieldName: '',
              })),
            });
          }}
          readonly={isFormDisabled}
        />

        <FormFieldInputContainer>
          <InputLabel>{t`Questions`}</InputLabel>

          {formData.questions.length === 0 && (
            <Callout
              variant="neutral"
              isClosable={false}
              title={t`Add the questions to ask`}
              description={t`When this step runs, the person who triggered the workflow is asked all of these questions at once. Each answer is saved to its own field.`}
            />
          )}

          <DraggableList
            onDragEnd={handleQuestionDragEnd}
            draggableItems={formData.questions.map((question, index) => (
              <DraggableItem
                key={question.id}
                draggableId={question.id}
                index={index}
                isDragDisabled={isFormDisabled}
                isInsideScrollableContainer
                disableDraggingBackground
                itemComponent={() => (
                  <WorkflowEditActionUserFormQuestion
                    question={question}
                    index={index}
                    fieldOptions={fieldOptions}
                    readonly={isFormDisabled}
                    onChange={(partialQuestion) =>
                      updateFormData({
                        questions: formData.questions.map((currentQuestion) =>
                          currentQuestion.id === question.id
                            ? { ...currentQuestion, ...partialQuestion }
                            : currentQuestion,
                        ),
                      })
                    }
                    onDelete={() =>
                      updateFormData({
                        questions: formData.questions.filter(
                          (currentQuestion) =>
                            currentQuestion.id !== question.id,
                        ),
                      })
                    }
                  />
                )}
              />
            ))}
          />

          {!isFormDisabled && (
            <StyledAddQuestionContainer>
              <Button
                Icon={IconPlus}
                title={t`Add question`}
                variant="secondary"
                size="small"
                onClick={() =>
                  updateFormData({
                    questions: [
                      ...formData.questions,
                      {
                        id: v4(),
                        question: '',
                        fieldName: '',
                        isRequired: false,
                      },
                    ],
                  })
                }
              />
            </StyledAddQuestionContainer>
          )}
        </FormFieldInputContainer>

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
