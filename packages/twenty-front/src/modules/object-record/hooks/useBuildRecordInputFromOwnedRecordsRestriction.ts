import { useCallback } from 'react';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';

// When a role may only access records it owns, a record it creates has to be
// owned by it, otherwise the server rejects the insert. The owner column is the
// join column of a many-to-one relation, so it is also the record input key.
export const useBuildRecordInputFromOwnedRecordsRestriction = ({
  objectMetadataItem,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
}) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectPermissions = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataItem.id,
  );

  const ownerColumnName =
    objectPermissions?.ownedRecordsRestriction?.ownerColumnName;

  const buildRecordInputFromOwnedRecordsRestriction =
    useCallback((): Partial<ObjectRecord> => {
      if (!isDefined(ownerColumnName) || !isDefined(currentWorkspaceMember)) {
        return {};
      }

      return { [ownerColumnName]: currentWorkspaceMember.id };
    }, [ownerColumnName, currentWorkspaceMember]);

  return { buildRecordInputFromOwnedRecordsRestriction };
};
