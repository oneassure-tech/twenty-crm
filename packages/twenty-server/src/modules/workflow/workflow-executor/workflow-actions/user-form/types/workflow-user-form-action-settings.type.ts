import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

export type UserFormQuestion = {
  id: string;
  question: string;
  fieldName: string;
  isRequired: boolean;
};

export type UserFormInput = {
  questions: UserFormQuestion[];
  objectName: string;
  objectRecordId: string;
};

export type WorkflowUserFormActionSettings = BaseWorkflowActionSettings & {
  input: UserFormInput;
};
