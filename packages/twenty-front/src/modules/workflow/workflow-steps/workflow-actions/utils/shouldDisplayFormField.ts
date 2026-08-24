import { type FieldMetadataItem } from '@/object-metadata/types/FieldMetadataItem';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import {
  type WorkflowActionType,
  type WorkflowTriggerType,
} from '@/workflow/types/Workflow';
import { CustomError } from 'twenty-shared/utils';
import { FieldMetadataType } from '~/generated-metadata/graphql';

const SUPPORTED_FORM_FIELD_TYPES = [
  FieldMetadataType.TEXT,
  FieldMetadataType.NUMBER,
  FieldMetadataType.DATE,
  FieldMetadataType.BOOLEAN,
  FieldMetadataType.SELECT,
  FieldMetadataType.MULTI_SELECT,
  FieldMetadataType.EMAILS,
  FieldMetadataType.LINKS,
  FieldMetadataType.FULL_NAME,
  FieldMetadataType.ADDRESS,
  FieldMetadataType.PHONES,
  FieldMetadataType.CURRENCY,
  FieldMetadataType.DATE_TIME,
  FieldMetadataType.RAW_JSON,
  FieldMetadataType.UUID,
  FieldMetadataType.ARRAY,
  FieldMetadataType.RELATION,
  FieldMetadataType.MORPH_RELATION,
  FieldMetadataType.RICH_TEXT,
];

const REQUIRE_FIELD_SUPPORTED_TYPES = [
  FieldMetadataType.TEXT,
  FieldMetadataType.NUMBER,
  FieldMetadataType.DATE,
  FieldMetadataType.SELECT,
  FieldMetadataType.MULTI_SELECT,
];

export const shouldDisplayFormField = ({
  fieldMetadataItem,
  actionType,
}: {
  fieldMetadataItem: FieldMetadataItem;
  actionType: WorkflowActionType | WorkflowTriggerType;
}) => {
  if (!SUPPORTED_FORM_FIELD_TYPES.includes(fieldMetadataItem.type)) {
    return false;
  }

  const isIdField = fieldMetadataItem.name === 'id';

  const isNotSupportedRelation =
    (fieldMetadataItem.type === FieldMetadataType.RELATION ||
      fieldMetadataItem.type === FieldMetadataType.MORPH_RELATION) &&
    fieldMetadataItem.settings?.['relationType'] !== 'MANY_TO_ONE';

  switch (actionType) {
    case 'CREATE_RECORD':
    case 'UPDATE_RECORD':
      return (
        !isNotSupportedRelation &&
        (fieldMetadataItem.isUIEditable ?? true) &&
        !isHiddenSystemField(fieldMetadataItem) &&
        fieldMetadataItem.isActive
      );
    // Deliberately narrower than UPDATE_RECORD: a person answers this inline in
    // a modal, so only field types with a simple single-value input qualify.
    case 'REQUIRE_FIELD':
      return (
        REQUIRE_FIELD_SUPPORTED_TYPES.includes(fieldMetadataItem.type) &&
        (fieldMetadataItem.isUIEditable ?? true) &&
        !isHiddenSystemField(fieldMetadataItem) &&
        fieldMetadataItem.isActive
      );
    case 'UPSERT_RECORD':
      return (
        (!isNotSupportedRelation &&
          (fieldMetadataItem.isUIEditable ?? true) &&
          !isHiddenSystemField(fieldMetadataItem) &&
          fieldMetadataItem.isActive) ||
        isIdField
      );
    case 'FIND_RECORDS':
      return (
        !isNotSupportedRelation &&
        (!isHiddenSystemField(fieldMetadataItem) || isIdField) &&
        fieldMetadataItem.isActive
      );
    case 'DATABASE_EVENT':
      return (
        !isNotSupportedRelation &&
        !isHiddenSystemField(fieldMetadataItem) &&
        fieldMetadataItem.isActive
      );
    default:
      throw new CustomError(
        `Action "${actionType}" is not supported`,
        'UNSUPPORTED_ACTION_TYPE',
      );
  }
};
