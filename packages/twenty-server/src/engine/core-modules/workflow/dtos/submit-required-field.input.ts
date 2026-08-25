import { Field, InputType } from '@nestjs/graphql';

import graphqlTypeJson from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// Separate from SubmitFormStepInput on purpose. That input belongs to the
// admin-only form flow; keeping this one distinct means the member-facing
// endpoint can never widen to accept arbitrary form step payloads.
@InputType()
export class SubmitRequiredFieldInput {
  @Field(() => UUIDScalarType, { nullable: false })
  workflowRunId: string;

  @Field(() => UUIDScalarType, { nullable: false })
  stepId: string;

  @Field(() => graphqlTypeJson, {
    description: 'Answer to write to the field',
    nullable: false,
  })
  value: JSON;
}
