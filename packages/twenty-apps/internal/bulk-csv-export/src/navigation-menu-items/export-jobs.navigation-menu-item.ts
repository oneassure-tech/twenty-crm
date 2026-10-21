import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  EXPORT_JOBS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  EXPORT_JOBS_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: EXPORT_JOBS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Bulk exports',
  icon: 'IconFile',
  color: 'blue',
  position: 0,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: EXPORT_JOBS_VIEW_UNIVERSAL_IDENTIFIER,
});
