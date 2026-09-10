import { Field, InputType } from '@nestjs/graphql';

import graphqlTypeJson from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class SubmitUserFormInput {
  @Field(() => UUIDScalarType, {
    description: 'Workflow run ID',
    nullable: false,
  })
  workflowRunId: string;

  @Field(() => UUIDScalarType, {
    description: 'Workflow step ID',
    nullable: false,
  })
  stepId: string;

  // Answers are keyed by field name and typed like the field they target - a
  // date answer arrives as an ISO string, a number as a number - so this
  // cannot be a map of strings.
  @Field(() => graphqlTypeJson, {
    description: 'Answers keyed by the name of the field they are written to',
    nullable: false,
  })
  answers: Record<string, unknown>;
}
