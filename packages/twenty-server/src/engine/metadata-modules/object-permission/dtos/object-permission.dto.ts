import { Field, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import { RestrictedFieldsPermissions } from 'twenty-shared/types';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { OwnedRecordsRestrictionDTO } from 'src/engine/metadata-modules/object-permission/dtos/owned-records-restriction.dto';
import { RowLevelPermissionPredicateGroupDTO } from 'src/engine/metadata-modules/row-level-permission-predicate/dtos/row-level-permission-predicate-group.dto';
import { RowLevelPermissionPredicateDTO } from 'src/engine/metadata-modules/row-level-permission-predicate/dtos/row-level-permission-predicate.dto';

@ObjectType('ObjectPermission')
export class ObjectPermissionDTO {
  @Field(() => UUIDScalarType, { nullable: false })
  objectMetadataId: string;

  @Field({ nullable: true })
  canReadObjectRecords?: boolean;

  @Field({ nullable: true })
  canUpdateObjectRecords?: boolean;

  @Field({ nullable: true })
  canSoftDeleteObjectRecords?: boolean;

  @Field({ nullable: true })
  canDestroyObjectRecords?: boolean;

  // Relation field designating record ownership for this object under this role.
  @Field(() => UUIDScalarType, { nullable: true })
  ownerFieldMetadataId?: string | null;

  // Resolved server-side; null when this object is not restricted to owned records.
  @Field(() => OwnedRecordsRestrictionDTO, { nullable: true })
  ownedRecordsRestriction?: OwnedRecordsRestrictionDTO | null;

  @Field(() => GraphQLJSON, {
    nullable: true,
  })
  restrictedFields?: RestrictedFieldsPermissions;

  @Field(() => [RowLevelPermissionPredicateDTO], { nullable: true })
  rowLevelPermissionPredicates?: RowLevelPermissionPredicateDTO[];

  @Field(() => [RowLevelPermissionPredicateGroupDTO], { nullable: true })
  rowLevelPermissionPredicateGroups?: RowLevelPermissionPredicateGroupDTO[];
}
