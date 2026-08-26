import { Field, ObjectType } from '@nestjs/graphql';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// The client needs to know exactly which record changed so it can refresh that
// record in place, instead of the user having to reload the page to see the
// answer that was just saved.
@ObjectType('SubmitUserPromptResult')
export class SubmitUserPromptResultDTO {
  @Field(() => Boolean, { description: 'Whether the answer was saved' })
  success: boolean;

  @Field(() => String, {
    description: 'Singular name of the object whose record was updated',
  })
  objectNameSingular: string;

  @Field(() => String, {
    description: 'Plural name of the object whose record was updated',
  })
  objectNamePlural: string;

  @Field(() => UUIDScalarType, {
    description: 'Id of the record the answer was written to',
  })
  recordId: string;
}
