import { z } from 'zod';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';
import { workflowRequireFieldActionSettingsSchema } from './require-field-action-settings-schema';

export const workflowRequireFieldActionSchema = baseWorkflowActionSchema.extend(
  {
    type: z.literal('REQUIRE_FIELD'),
    settings: workflowRequireFieldActionSettingsSchema,
  },
);
