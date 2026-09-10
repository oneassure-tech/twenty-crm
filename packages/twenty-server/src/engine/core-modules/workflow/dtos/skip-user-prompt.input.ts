import { Field, InputType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class SkipUserPromptInput {
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
}
