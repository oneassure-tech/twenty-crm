import { Module } from '@nestjs/common';

import { UserPromptWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-prompt/user-prompt.workflow-action';

@Module({
  providers: [UserPromptWorkflowAction],
  exports: [UserPromptWorkflowAction],
})
export class UserPromptActionModule {}
