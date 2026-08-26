import { gql } from '@apollo/client';

export const PENDING_USER_PROMPTS = gql`
  query PendingUserPrompts {
    pendingUserPrompts {
      workflowRunId
      stepId
      question
      options {
        id
        label
      }
      allowOtherOption
      otherOptionLabel
    }
  }
`;
