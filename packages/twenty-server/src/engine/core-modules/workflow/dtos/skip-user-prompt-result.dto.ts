import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SkipUserPromptResult')
export class SkipUserPromptResultDTO {
  @Field(() => Boolean, {
    description: 'Whether the question was closed and the step skipped',
  })
  success: boolean;
}
