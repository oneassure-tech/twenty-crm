import { FieldMetadataType } from 'twenty-shared/types';

// An answer is one value typed into one input, so the step only offers fields
// whose whole value a person can give in a single answer. Composite fields
// (address, full name, currency...) are left out on purpose.
export const USER_FORM_SUPPORTED_FIELD_TYPES: FieldMetadataType[] = [
  FieldMetadataType.TEXT,
  FieldMetadataType.NUMBER,
  FieldMetadataType.NUMERIC,
  FieldMetadataType.DATE,
  FieldMetadataType.DATE_TIME,
  FieldMetadataType.BOOLEAN,
  FieldMetadataType.SELECT,
  FieldMetadataType.MULTI_SELECT,
  FieldMetadataType.RATING,
];
