import { Field, ObjectType } from '@nestjs/graphql';

import graphqlTypeJson from 'graphql-type-json';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';

// The client needs to know exactly which record changed and what was written
// to it, so it can refresh that record in place instead of the user having to
// reload the page to see the answers that were just saved.
@ObjectType('SubmitUserFormResult')
export class SubmitUserFormResultDTO {
  @Field(() => Boolean, { description: 'Whether the answers were saved' })
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
    description: 'Id of the record the answers were written to',
  })
  recordId: string;

  @Field(() => graphqlTypeJson, {
    description: 'Answers that were written, keyed by field name',
  })
  answers: Record<string, unknown>;
}
