// Added to replace a direct workflowRun record query. Twenty gates every
// workflow object behind the WORKFLOWS settings permission, so that query
// returned nothing for ordinary members and the prompt silently never showed.
// This endpoint answers only "what is waiting on me", so it needs no such
// permission and exposes nothing else about the workflow.
import { gql } from '@apollo/client';

export const FIND_MY_PENDING_REQUIRED_FIELDS = gql`
  query FindMyPendingRequiredFields {
    findMyPendingRequiredFields {
      workflowRunId
      stepId
      label
      placeholder
      type
      fieldMetadataId
      objectNameSingular
      fieldName
      recordId
    }
  }
`;
