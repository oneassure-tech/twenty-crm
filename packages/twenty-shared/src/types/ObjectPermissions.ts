import { type OwnedRecordsRestriction } from './OwnedRecordsRestriction';
import { type RestrictedFieldsPermissions } from './RestrictedFieldsPermissions';
import { type RowLevelPermissionPredicate } from './RowLevelPermissionPredicate';
import { type RowLevelPermissionPredicateGroup } from './RowLevelPermissionPredicateGroup';

export type ObjectPermissions = {
  canReadObjectRecords: boolean;
  canUpdateObjectRecords: boolean;
  canSoftDeleteObjectRecords: boolean;
  canDestroyObjectRecords: boolean;
  restrictedFields: RestrictedFieldsPermissions;
  // Optional so existing constructions of this type keep compiling.
  // Absent or null means the role is not restricted to owned records here.
  ownedRecordsRestriction?: OwnedRecordsRestriction | null;
  rowLevelPermissionPredicates: RowLevelPermissionPredicate[];
  rowLevelPermissionPredicateGroups: RowLevelPermissionPredicateGroup[];
};
