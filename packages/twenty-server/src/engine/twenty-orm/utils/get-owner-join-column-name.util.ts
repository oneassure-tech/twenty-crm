import { type EntityMetadata } from 'typeorm';

const WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR = 'workspaceMember';

export const OWNER_JOIN_COLUMN_NAME = 'ownerId';

/**
 * Returns the join column expressing record ownership on this entity, or
 * undefined when the entity has no owner concept - those objects keep being
 * governed by ordinary object-level permissions only.
 *
 * Ownership is a MANY_TO_ONE relation to workspaceMember joined on "ownerId".
 * We assert the relation rather than merely looking for a column of that name,
 * so an unrelated column called "ownerId" can never be mistaken for ownership.
 */
export const getOwnerJoinColumnName = (
  entityMetadata: EntityMetadata,
): string | undefined => {
  const hasOwnerRelation = entityMetadata.relations.some(
    (relation) =>
      relation.isManyToOne &&
      relation.inverseEntityMetadata.name ===
        WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR &&
      relation.joinColumns.some(
        (joinColumn) => joinColumn.databaseName === OWNER_JOIN_COLUMN_NAME,
      ),
  );

  return hasOwnerRelation ? OWNER_JOIN_COLUMN_NAME : undefined;
};
