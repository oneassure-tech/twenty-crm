// Replaces submitFormStep + updateWorkflowRunStep, which both live on a
// resolver guarded by the WORKFLOWS settings permission and so were unusable by
// members. The server performs both steps here after checking the prompt
// belongs to the caller.
import { gql } from '@apollo/client';

export const SUBMIT_MY_REQUIRED_FIELD = gql`
  mutation SubmitMyRequiredField($input: SubmitRequiredFieldInput!) {
    submitMyRequiredField(input: $input)
  }
`;
