import { type WorkflowActionType } from 'twenty-shared/workflow';

import { type UserFormQuestion } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/types/workflow-user-form-action-settings.type';
import { type UserPromptOption } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/types/workflow-user-prompt-action-settings.type';

// One pending question queue serves both human-input steps: an Ask User step
// contributes an option list, an Ask User Form step contributes its questions.
// `kind` says which half of this payload is meaningful.
export type PendingUserPrompt = {
  workflowRunId: string;
  stepId: string;
  kind: WorkflowActionType.USER_PROMPT | WorkflowActionType.USER_FORM;
  question: string;
  options: UserPromptOption[];
  allowOtherOption: boolean;
  otherOptionLabel: string;
  objectNameSingular: string;
  questions: UserFormQuestion[];
};

export type UpdatedRecordInfo = {
  success: boolean;
  objectNameSingular: string;
  objectNamePlural: string;
  recordId: string;
  fieldName: string;
  answer: string;
};

export type UpdatedRecordFieldsInfo = {
  success: boolean;
  objectNameSingular: string;
  objectNamePlural: string;
  recordId: string;
  answers: Record<string, unknown>;
};

export type SkippedUserPromptInfo = {
  success: boolean;
};
