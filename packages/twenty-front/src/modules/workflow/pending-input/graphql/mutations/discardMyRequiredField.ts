// Replaces stopWorkflowRun, which is admin-only. Stopping is allowed here only
// for a run whose prompt is addressed to the caller.
import { gql } from '@apollo/client';

export const DISCARD_MY_REQUIRED_FIELD = gql`
  mutation DiscardMyRequiredField($input: DiscardRequiredFieldInput!) {
    discardMyRequiredField(input: $input)
  }
`;
