import { gql } from '@apollo/client';

export const SKIP_USER_PROMPT = gql`
  mutation SkipUserPrompt($input: SkipUserPromptInput!) {
    skipUserPrompt(input: $input) {
      success
    }
  }
`;
