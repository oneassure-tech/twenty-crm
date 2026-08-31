import { FieldMetadataType, RelationType } from 'twenty-shared/types';
import { isDefined, isNonEmptyString } from 'twenty-shared/utils';

// Shape shared by FieldMetadataEntity and FlatFieldMetadata, so this resolver
// can run against either.
export type OwnerFieldCandidate = {
  id: string;
  type: FieldMetadataType;
  objectMetadataId: string;
  relationTargetObjectMetadataId?: string | null;
  settings?: {
    relationType?: RelationType;
    joinColumnName?: string | null;
  } | null;
};

type ResolveOwnerColumnNameArgs = {
  ownerFieldMetadataId?: string | null;
  objectMetadataId: string;
  workspaceMemberObjectMetadataId: string | undefined;
  fieldMetadataById: Map<string, OwnerFieldCandidate>;
};

// Resolves the foreign key column that holds the owner of a record.
//
// An owner field is a MANY_TO_ONE relation pointing at workspaceMember, which
// TypeORM stores as a plain uuid column on the object's own table (ownerId,
// accountOwnerId, ...). That lets the restriction be a single equality check
// with no join.
//
// Returns null when the object has no owner field designated, which leaves the
// object unrestricted.
export const resolveOwnerColumnName = ({
  ownerFieldMetadataId,
  objectMetadataId,
  workspaceMemberObjectMetadataId,
  fieldMetadataById,
}: ResolveOwnerColumnNameArgs): string | null => {
  if (!isDefined(ownerFieldMetadataId)) {
    return null;
  }

  const ownerFieldMetadata = fieldMetadataById.get(ownerFieldMetadataId);

  if (!isDefined(ownerFieldMetadata)) {
    return null;
  }

  if (
    !isOwnerFieldCandidate({
      ownerFieldMetadata,
      workspaceMemberObjectMetadataId,
    })
  ) {
    return null;
  }

  // Guard against a field designated on one object being read for another.
  if (ownerFieldMetadata.objectMetadataId !== objectMetadataId) {
    return null;
  }

  const joinColumnName = ownerFieldMetadata.settings?.joinColumnName;

  return isNonEmptyString(joinColumnName) ? joinColumnName : null;
};

// A field may only designate ownership when it is a MANY_TO_ONE relation to
// workspaceMember. Anything else cannot be compared to the current member.
export const isOwnerFieldCandidate = ({
  ownerFieldMetadata,
  workspaceMemberObjectMetadataId,
}: {
  ownerFieldMetadata: OwnerFieldCandidate;
  workspaceMemberObjectMetadataId: string | undefined;
}): boolean => {
  if (ownerFieldMetadata.type !== FieldMetadataType.RELATION) {
    return false;
  }

  if (ownerFieldMetadata.settings?.relationType !== RelationType.MANY_TO_ONE) {
    return false;
  }

  if (!isDefined(workspaceMemberObjectMetadataId)) {
    return false;
  }

  return (
    ownerFieldMetadata.relationTargetObjectMetadataId ===
    workspaceMemberObjectMetadataId
  );
};
