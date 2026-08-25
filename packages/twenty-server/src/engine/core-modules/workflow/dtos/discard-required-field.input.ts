import { Field, InputType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// stepId is required alongside the run id so the server can confirm the caller
// is discarding the specific prompt raised for them, not just any run.
@InputType()
export class DiscardRequiredFieldInput {
  @Field(() => UUIDScalarType, { nullable: false })
  workflowRunId: string;

  @Field(() => UUIDScalarType, { nullable: false })
  stepId: string;
}
