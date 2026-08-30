import { type RestrictedFieldsPermissions } from './RestrictedFieldsPermissions';
import { type RowLevelPermissionPredicate } from './RowLevelPermissionPredicate';
import { type RowLevelPermissionPredicateGroup } from './RowLevelPermissionPredicateGroup';

export type ObjectPermissions = {
  canReadObjectRecords: boolean;
  canUpdateObjectRecords: boolean;
  canSoftDeleteObjectRecords: boolean;
  canDestroyObjectRecords: boolean;
  /**
   * When true, the role only sees records it owns. Optional so that the many
   * places building this shape keep compiling; absent is read as "unrestricted",
   * which is the safe default since the restriction is opt-in per role.
   */
  restrictToOwnedRecords?: boolean;
  restrictedFields: RestrictedFieldsPermissions;
  rowLevelPermissionPredicates: RowLevelPermissionPredicate[];
  rowLevelPermissionPredicateGroups: RowLevelPermissionPredicateGroup[];
};
