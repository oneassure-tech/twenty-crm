import { FieldMetadataType } from 'twenty-shared/types';

// Fields a person can answer directly in the form, each with its own input -
// a date picker for dates, a URL input for links, and so on. Relations are
// left out (they would need a record picker), as are files, rich text and
// system types, which are not something to ask a question about.
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
  FieldMetadataType.LINKS,
  FieldMetadataType.EMAILS,
  FieldMetadataType.PHONES,
  FieldMetadataType.CURRENCY,
  FieldMetadataType.FULL_NAME,
  FieldMetadataType.ADDRESS,
];
