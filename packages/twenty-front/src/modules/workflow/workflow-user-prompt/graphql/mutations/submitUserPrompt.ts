import { gql } from '@apollo/client';

export const SUBMIT_USER_PROMPT = gql`
  mutation SubmitUserPrompt($input: SubmitUserPromptInput!) {
    submitUserPrompt(input: $input) {
      success
      objectNameSingular
      objectNamePlural
      recordId
      fieldName
      answer
    }
  }
`;
