import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  EXPORT_CHUNK_CSV_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_JOB_ID_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_OBJECT_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_POSITION_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineObject({
  universalIdentifier: EXPORT_CHUNK_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'exportChunk',
  namePlural: 'exportChunks',
  labelSingular: 'Export chunk',
  labelPlural: 'Export chunks',
  description:
    'One page of a bulk CSV export. These records are combined into the file on the bulk export.',
  icon: 'IconFile',
  isSearchable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    EXPORT_CHUNK_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: EXPORT_CHUNK_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: EXPORT_CHUNK_JOB_ID_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'jobId',
      label: 'Export job',
      icon: 'IconLink',
    },
    {
      universalIdentifier: EXPORT_CHUNK_POSITION_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'position',
      label: 'Position',
      icon: 'IconHash',
    },
    {
      universalIdentifier: EXPORT_CHUNK_CSV_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'csv',
      label: 'CSV',
      icon: 'IconFile',
    },
  ],
});
