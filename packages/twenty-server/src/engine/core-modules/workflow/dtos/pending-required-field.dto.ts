import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Deliberately minimal: only what is needed to render and answer one prompt.
// Nothing about the workflow, its other steps, or who else it involves.
@ObjectType('PendingRequiredField')
export class PendingRequiredFieldDTO {
  @Field(() => UUIDScalarType)
  workflowRunId: string;

  @Field(() => UUIDScalarType)
  stepId: string;

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  placeholder: string | null;

  @Field(() => String)
  type: string;

  @Field(() => String)
  fieldMetadataId: string;

  @Field(() => String)
  objectNameSingular: string;

  @Field(() => String)
  fieldName: string;

  @Field(() => UUIDScalarType, { nullable: true })
  recordId: string | null;
}
