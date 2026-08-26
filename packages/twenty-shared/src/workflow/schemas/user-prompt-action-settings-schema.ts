import { z } from 'zod';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';

export const workflowUserPromptOptionSchema = z.object({
  id: z.string().describe('Unique identifier for the option within the step.'),
  label: z
    .string()
    .describe(
      'One-line text shown to the user, and the value written to the target field when this option is picked.',
    ),
});

export const workflowUserPromptActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      question: z
        .string()
        .describe(
          'Question shown at the top of the prompt, e.g. "Why is this lead not interested?".',
        ),
      options: z
        .array(workflowUserPromptOptionSchema)
        .describe(
          'Options the user chooses between. The user may pick exactly one.',
        ),
      allowOtherOption: z
        .boolean()
        .describe(
          'Whether the user may reject the options and type their own answer instead.',
        ),
      otherOptionLabel: z
        .string()
        .describe('Label of the free-text choice, defaults to "Other".'),
      objectName: z
        .string()
        .describe(
          'Singular name of the object holding the field the answer is written to, e.g. "lead".',
        ),
      objectRecordId: z
        .string()
        .describe(
          'Id of the record to update. Supports variables, defaults to "{{trigger.recordId}}".',
        ),
      fieldName: z
        .string()
        .describe(
          'Name of the TEXT field the answer is written to. A chosen option label and a typed "Other" answer both land here.',
        ),
    }),
  });
