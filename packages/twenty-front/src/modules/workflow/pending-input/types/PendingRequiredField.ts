// Mirrors the PendingRequiredField DTO. Kept hand-written rather than generated
// so the feature does not depend on a codegen run to compile.
export type PendingRequiredField = {
  workflowRunId: string;
  stepId: string;
  label: string;
  placeholder: string | null;
  type: string;
  fieldMetadataId: string;
  objectNameSingular: string;
  fieldName: string;
  recordId: string | null;
};
