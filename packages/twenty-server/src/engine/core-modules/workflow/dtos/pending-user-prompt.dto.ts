import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('UserPromptOption')
export class UserPromptOptionDTO {
  @Field(() => String, { description: 'Identifier of the option' })
  id: string;

  @Field(() => String, { description: 'Text shown to the user' })
  label: string;
}

@ObjectType('PendingUserPrompt')
export class PendingUserPromptDTO {
  @Field(() => UUIDScalarType, { description: 'Workflow run ID' })
  workflowRunId: string;

  @Field(() => UUIDScalarType, { description: 'Workflow step ID' })
  stepId: string;

  @Field(() => String, { description: 'Question shown to the user' })
  question: string;

  @Field(() => [UserPromptOptionDTO], {
    description: 'Options the user chooses between',
  })
  options: UserPromptOptionDTO[];

  @Field(() => Boolean, {
    description: 'Whether the user may type their own answer instead',
  })
  allowOtherOption: boolean;

  @Field(() => String, { description: 'Label of the free-text choice' })
  otherOptionLabel: string;
}
