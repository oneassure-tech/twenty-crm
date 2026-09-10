import { Field, ObjectType } from '@nestjs/graphql';

import { WorkflowActionType } from 'twenty-shared/workflow';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

@ObjectType('UserPromptOption')
export class UserPromptOptionDTO {
  @Field(() => String, { description: 'Identifier of the option' })
  id: string;

  @Field(() => String, { description: 'Text shown to the user' })
  label: string;
}

@ObjectType('PendingUserPromptQuestion')
export class PendingUserPromptQuestionDTO {
  @Field(() => String, { description: 'Identifier of the question' })
  id: string;

  @Field(() => String, { description: 'Question shown to the user' })
  question: string;

  @Field(() => String, {
    description: 'Name of the field this answer is written to',
  })
  fieldName: string;

  @Field(() => Boolean, {
    description: 'Whether this question must be answered before saving',
  })
  isRequired: boolean;
}

// One queue serves both human-input steps. `kind` says which fields below
// carry the question: USER_PROMPT fills `question`/`options`, USER_FORM fills
// `questions`.
@ObjectType('PendingUserPrompt')
export class PendingUserPromptDTO {
  @Field(() => UUIDScalarType, { description: 'Workflow run ID' })
  workflowRunId: string;

  @Field(() => UUIDScalarType, { description: 'Workflow step ID' })
  stepId: string;

  @Field(() => WorkflowActionType, {
    description: 'Which human-input step this pending question comes from',
  })
  kind: WorkflowActionType.USER_PROMPT | WorkflowActionType.USER_FORM;

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

  @Field(() => String, {
    description:
      'Singular name of the object whose record the answers are written to',
  })
  objectNameSingular: string;

  @Field(() => [PendingUserPromptQuestionDTO], {
    description: 'Questions asked together, when this is an Ask User Form step',
  })
  questions: PendingUserPromptQuestionDTO[];
}
