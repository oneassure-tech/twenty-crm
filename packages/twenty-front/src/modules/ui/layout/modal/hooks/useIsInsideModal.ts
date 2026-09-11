import { ModalComponentInstanceContext } from '@/ui/layout/modal/contexts/ModalComponentInstanceContext';
import { useContext } from 'react';
import { isDefined } from 'twenty-shared/utils';

// Floating layers (dropdowns, date pickers) portal to document.body, outside
// the modal's DOM, so they cannot inherit its stacking context. They use this
// to know they must sit above the modal instead of under its backdrop.
// Context still flows through React portals, so this holds for layers nested
// inside other floating layers too.
export const useIsInsideModal = () =>
  isDefined(useContext(ModalComponentInstanceContext));
