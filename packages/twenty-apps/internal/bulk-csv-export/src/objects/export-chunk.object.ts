import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  EXPORT_CHUNK_CREATED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_CREATED_BY_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_CSV_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_DELETED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_ID_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_JOB_ID_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_OBJECT_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_POSITION_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_SEARCH_VECTOR_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_UPDATED_AT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_CHUNK_UPDATED_BY_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { systemFields } from 'src/objects/system-fields';

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
    ...systemFields({
      id: EXPORT_CHUNK_ID_FIELD_UNIVERSAL_IDENTIFIER,
      createdAt: EXPORT_CHUNK_CREATED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      updatedAt: EXPORT_CHUNK_UPDATED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      deletedAt: EXPORT_CHUNK_DELETED_AT_FIELD_UNIVERSAL_IDENTIFIER,
      createdBy: EXPORT_CHUNK_CREATED_BY_FIELD_UNIVERSAL_IDENTIFIER,
      updatedBy: EXPORT_CHUNK_UPDATED_BY_FIELD_UNIVERSAL_IDENTIFIER,
      position: EXPORT_CHUNK_POSITION_FIELD_UNIVERSAL_IDENTIFIER,
      searchVector: EXPORT_CHUNK_SEARCH_VECTOR_FIELD_UNIVERSAL_IDENTIFIER,
    }),
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
      universalIdentifier: EXPORT_CHUNK_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'chunkIndex',
      label: 'Chunk index',
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
