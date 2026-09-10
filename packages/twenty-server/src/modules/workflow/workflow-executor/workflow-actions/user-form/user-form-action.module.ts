import { Module } from '@nestjs/common';

import { UserFormWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/user-form/user-form.workflow-action';

@Module({
  providers: [UserFormWorkflowAction],
  exports: [UserFormWorkflowAction],
})
export class UserFormActionModule {}
