import { type FieldMetadataType } from 'twenty-shared/types';

import { type BaseWorkflowActionSettings } from 'src/modules/workflow/workflow-executor/workflow-actions/types/workflow-action-settings.type';

export type WorkflowRequireFieldType =
  | FieldMetadataType.TEXT
  | FieldMetadataType.NUMBER
  | FieldMetadataType.DATE
  | FieldMetadataType.SELECT
  | FieldMetadataType.MULTI_SELECT;

export type WorkflowRequireFieldActionInput = {
  objectName: string;
  objectRecordId: string;
  fieldName: string;
  fieldMetadataId: string;
  label: string;
  placeholder?: string;
  type: WorkflowRequireFieldType;
  // Absent until a human answers; its presence is what ends the pending state.
  // oxlint-disable-next-line typescript/no-explicit-any
  value?: any;
};

export type WorkflowRequireFieldActionSettings = BaseWorkflowActionSettings & {
  input: WorkflowRequireFieldActionInput;
};
