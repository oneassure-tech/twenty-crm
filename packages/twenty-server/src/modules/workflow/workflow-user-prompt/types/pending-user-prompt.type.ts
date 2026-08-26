import { type UserPromptOption } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/types/workflow-user-prompt-action-settings.type';

export type PendingUserPrompt = {
  workflowRunId: string;
  stepId: string;
  question: string;
  options: UserPromptOption[];
  allowOtherOption: boolean;
  otherOptionLabel: string;
};

export type UpdatedRecordInfo = {
  success: boolean;
  objectNameSingular: string;
  objectNamePlural: string;
  recordId: string;
};
