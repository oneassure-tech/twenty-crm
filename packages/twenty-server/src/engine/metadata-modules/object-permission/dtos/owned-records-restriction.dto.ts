import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('OwnedRecordsRestriction')
export class OwnedRecordsRestrictionDTO {
  // Foreign key column on the object's own table holding the owner's
  // workspace member id.
  @Field({ nullable: false })
  ownerColumnName: string;
}
