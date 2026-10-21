import { defineCommandMenuItem } from 'twenty-sdk/define';

import {
  BULK_CSV_EXPORT_COMMAND_UNIVERSAL_IDENTIFIER,
  BULK_CSV_EXPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineCommandMenuItem({
  universalIdentifier: BULK_CSV_EXPORT_COMMAND_UNIVERSAL_IDENTIFIER,
  label: 'Bulk CSV export',
  shortLabel: 'Bulk export',
  isPinned: true,
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier:
    BULK_CSV_EXPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
