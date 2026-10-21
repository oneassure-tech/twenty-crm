import { defineView, ViewKey } from 'twenty-sdk/define';

import {
  EXPORT_JOB_EXPORTED_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_FILE_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_OBJECT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOB_TOTAL_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_EXPORTED_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_FILE_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_OBJECT_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: EXPORT_JOBS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All bulk exports',
  objectUniversalIdentifier: EXPORT_JOB_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconFile',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: EXPORT_JOBS_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: EXPORT_JOBS_VIEW_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_STATUS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: EXPORT_JOBS_VIEW_OBJECT_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_OBJECT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: EXPORT_JOBS_VIEW_EXPORTED_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_EXPORTED_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: EXPORT_JOBS_VIEW_TOTAL_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_TOTAL_COUNT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 110,
    },
    {
      universalIdentifier: EXPORT_JOBS_VIEW_FILE_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier:
        EXPORT_JOB_FILE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 180,
    },
  ],
});
