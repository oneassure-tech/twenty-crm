import { z } from 'zod';
import { FieldMetadataType } from '../../types/FieldMetadataType';
import { baseWorkflowActionSettingsSchema } from './base-workflow-action-settings-schema';

export const workflowRequireFieldActionSettingsSchema =
  baseWorkflowActionSettingsSchema.extend({
    input: z.object({
      objectName: z
        .string()
        .describe(
          'Name of the object holding the field that must be filled (e.g. "lead").',
        ),
      objectRecordId: z
        .string()
        .describe(
          'Id of the record to write to. Usually the record that triggered the workflow, i.e. "{{trigger.object.id}}".',
        ),
      fieldName: z
        .string()
        .describe('Name of the field that must be filled on that record.'),
      fieldMetadataId: z
        .string()
        .describe(
          'Field metadata id of the target field, used to render the matching input at run time.',
        ),
      label: z
        .string()
        .describe('Question shown to the person asked to fill the field.'),
      placeholder: z.string().optional(),
      type: z.union([
        z.literal(FieldMetadataType.TEXT),
        z.literal(FieldMetadataType.NUMBER),
        z.literal(FieldMetadataType.DATE),
        z.literal(FieldMetadataType.SELECT),
        z.literal(FieldMetadataType.MULTI_SELECT),
      ]),
      // Filled in at run time when a human answers, not at configuration time.
      // Its presence is what tells the action to stop waiting and write.
      value: z.any().optional(),
    }),
  });
