import { gql } from '@apollo/client';

export const SUBMIT_USER_FORM = gql`
  mutation SubmitUserForm($input: SubmitUserFormInput!) {
    submitUserForm(input: $input) {
      success
      objectNameSingular
      objectNamePlural
      recordId
      answers
    }
  }
`;
