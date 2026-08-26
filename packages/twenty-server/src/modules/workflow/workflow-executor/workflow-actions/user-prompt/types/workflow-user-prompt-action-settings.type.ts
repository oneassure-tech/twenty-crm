import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

export type UserPromptOption = {
  id: string;
  label: string;
};

export type UserPromptInput = {
  question: string;
  options: UserPromptOption[];
  allowOtherOption: boolean;
  otherOptionLabel: string;
  objectName: string;
  objectRecordId: string;
  fieldName: string;
};

export type WorkflowUserPromptActionSettings = BaseWorkflowActionSettings & {
  input: UserPromptInput;
};
