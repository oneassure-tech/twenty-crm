import { Field, InputType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@InputType()
export class SubmitUserPromptInput {
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

  @Field(() => String, {
    description:
      'Id of the chosen option, or the "Other" sentinel when the user typed their own answer',
    nullable: false,
  })
  selectedOptionId: string;

  @Field(() => String, {
    description: 'Answer typed by the user when the "Other" choice is selected',
    nullable: true,
  })
  otherValue?: string;
}
