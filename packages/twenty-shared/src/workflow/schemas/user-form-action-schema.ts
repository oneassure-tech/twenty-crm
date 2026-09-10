import { z } from 'zod';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';
import { workflowUserFormActionSettingsSchema } from './user-form-action-settings-schema';

export const workflowUserFormActionSchema = baseWorkflowActionSchema.extend({
  type: z.literal('USER_FORM'),
  settings: workflowUserFormActionSettingsSchema,
});
