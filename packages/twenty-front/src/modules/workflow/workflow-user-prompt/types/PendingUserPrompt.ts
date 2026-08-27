export type UserPromptOption = {
  id: string;
  label: string;
};

export type PendingUserPrompt = {
  workflowRunId: string;
  stepId: string;
  question: string;
  options: UserPromptOption[];
  allowOtherOption: boolean;
  otherOptionLabel: string;
};
