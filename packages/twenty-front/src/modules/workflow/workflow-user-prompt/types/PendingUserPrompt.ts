export type UserPromptOption = {
  id: string;
  label: string;
};

export type PendingUserPromptQuestion = {
  id: string;
  question: string;
  fieldName: string;
  isRequired: boolean;
};

// One queue serves both human-input steps. `kind` says which half of this
// payload carries the question.
export type PendingUserPrompt = {
  workflowRunId: string;
  stepId: string;
  kind: 'USER_PROMPT' | 'USER_FORM';
  question: string;
  options: UserPromptOption[];
  allowOtherOption: boolean;
  otherOptionLabel: string;
  objectNameSingular: string;
  questions: PendingUserPromptQuestion[];
};
