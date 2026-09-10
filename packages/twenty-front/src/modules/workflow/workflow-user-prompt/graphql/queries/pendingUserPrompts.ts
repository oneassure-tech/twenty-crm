import { gql } from '@apollo/client';

export const PENDING_USER_PROMPTS = gql`
  query PendingUserPrompts {
    pendingUserPrompts {
      workflowRunId
      stepId
      kind
      question
      options {
        id
        label
      }
      allowOtherOption
      otherOptionLabel
      objectNameSingular
      questions {
        id
        question
        fieldName
        isRequired
      }
    }
  }
`;
