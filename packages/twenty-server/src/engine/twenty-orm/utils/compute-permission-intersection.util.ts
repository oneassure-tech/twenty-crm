import {
  type ObjectsPermissions,
  type OwnedRecordsRestriction,
  type RestrictedFieldPermissions,
} from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

export const computePermissionIntersection = (
  permissionsArray: ObjectsPermissions[],
): ObjectsPermissions => {
  if (permissionsArray.length === 0) {
    return {};
  }

  if (permissionsArray.length === 1) {
    return permissionsArray[0];
  }

  const result: ObjectsPermissions = {};

  const allObjectMetadataIds = new Set<string>();

  for (const permissions of permissionsArray) {
    for (const id of Object.keys(permissions)) {
      allObjectMetadataIds.add(id);
    }
  }

  for (const objectMetadataId of allObjectMetadataIds) {
    let canReadObjectRecords = true;
    let canUpdateObjectRecords = true;
    let canSoftDeleteObjectRecords = true;
    let canDestroyObjectRecords = true;
    const restrictedFields: Record<string, RestrictedFieldPermissions> = {};
    // An intersection must be at least as restrictive as its most restrictive
    // input, so a restriction on any role is carried over rather than dropped.
    let ownedRecordsRestriction: OwnedRecordsRestriction | null = null;

    for (const permissions of permissionsArray) {
      const objPerm = permissions[objectMetadataId];

      if (!objPerm) {
        canReadObjectRecords = false;
        canUpdateObjectRecords = false;
        canSoftDeleteObjectRecords = false;
        canDestroyObjectRecords = false;
        continue;
      }

      canReadObjectRecords =
        canReadObjectRecords && objPerm.canReadObjectRecords === true;
      canUpdateObjectRecords =
        canUpdateObjectRecords && objPerm.canUpdateObjectRecords === true;
      canSoftDeleteObjectRecords =
        canSoftDeleteObjectRecords &&
        objPerm.canSoftDeleteObjectRecords === true;
      canDestroyObjectRecords =
        canDestroyObjectRecords && objPerm.canDestroyObjectRecords === true;

      if (
        !isDefined(ownedRecordsRestriction) &&
        isDefined(objPerm.ownedRecordsRestriction)
      ) {
        ownedRecordsRestriction = objPerm.ownedRecordsRestriction;
      }

      if (objPerm.restrictedFields) {
        for (const [fieldName, fieldPerm] of Object.entries(
          objPerm.restrictedFields,
        )) {
          if (!restrictedFields[fieldName]) {
            restrictedFields[fieldName] = {
              canRead: null,
              canUpdate: null,
            };
          }

          const current = restrictedFields[fieldName];

          restrictedFields[fieldName] = {
            canRead:
              current.canRead === false || fieldPerm.canRead === false
                ? false
                : null,
            canUpdate:
              current.canUpdate === false || fieldPerm.canUpdate === false
                ? false
                : null,
          };
        }
      }
    }

    result[objectMetadataId] = {
      canReadObjectRecords,
      canUpdateObjectRecords,
      canSoftDeleteObjectRecords,
      canDestroyObjectRecords,
      restrictedFields,
      ownedRecordsRestriction,
      rowLevelPermissionPredicates: [],
      rowLevelPermissionPredicateGroups: [],
    };
  }

  return result;
};
