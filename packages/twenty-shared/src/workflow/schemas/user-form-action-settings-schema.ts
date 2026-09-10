import { z } from 'zod';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';

export const workflowUserFormQuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question within the step.'),
  question: z
    .string()
    .describe(
      'Question shown to the user, e.g. "When is the demo scheduled?".',
    ),
  fieldName: z
    .string()
    .describe(
      'Name of the field on the target object this answer is written to. The field type decides which input the user is shown.',
    ),
  isRequired: z
    .boolean()
    .describe('Whether this question must be answered before saving.'),
});

export const workflowUserFormActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      questions: z
        .array(workflowUserFormQuestionSchema)
        .describe(
          'Questions asked together in one form. Every answer is written to its own field on the same record.',
        ),
      objectName: z
        .string()
        .describe(
          'Singular name of the object holding the fields the answers are written to, e.g. "lead".',
        ),
      objectRecordId: z
        .string()
        .describe(
          'Id of the record to update. Supports variables, defaults to "{{trigger.recordId}}".',
        ),
    }),
  });
