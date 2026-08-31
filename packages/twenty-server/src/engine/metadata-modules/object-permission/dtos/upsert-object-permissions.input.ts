import { Field, InputType } from '@nestjs/graphql';

import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class UpsertObjectPermissionsInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  roleId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty()
  @Field(() => [ObjectPermissionInput])
  objectPermissions: ObjectPermissionInput[];
}

@InputType()
export class ObjectPermissionInput {
  @IsUUID()
  @IsNotEmpty()
  @Field(() => UUIDScalarType)
  objectMetadataId: string;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canReadObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canUpdateObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canSoftDeleteObjectRecords?: boolean;

  @IsBoolean()
  @IsOptional()
  @Field({ nullable: true })
  canDestroyObjectRecords?: boolean;

  // MANY_TO_ONE relation field to workspaceMember that designates record
  // ownership. Only meaningful when the role restricts access to owned records.
  @IsUUID()
  @IsOptional()
  @Field(() => UUIDScalarType, { nullable: true })
  ownerFieldMetadataId?: string | null;
}
