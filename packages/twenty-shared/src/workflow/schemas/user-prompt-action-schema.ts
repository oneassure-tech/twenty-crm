import { z } from 'zod';
import { baseWorkflowActionSchema } from './base-workflow-action-schema';
import { workflowUserPromptActionSettingsSchema } from './user-prompt-action-settings-schema';

export const workflowUserPromptActionSchema = baseWorkflowActionSchema.extend({
  type: z.literal('USER_PROMPT'),
  settings: workflowUserPromptActionSettingsSchema,
});
