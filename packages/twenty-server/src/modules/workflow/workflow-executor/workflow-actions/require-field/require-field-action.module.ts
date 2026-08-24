import { Module } from '@nestjs/common';

import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { RecordCrudModule } from 'src/engine/core-modules/record-crud/record-crud.module';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { RoleModule } from 'src/engine/metadata-modules/role/role.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkflowCommonModule } from 'src/modules/workflow/common/workflow-common.module';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { RequireFieldWorkflowAction } from 'src/modules/workflow/workflow-executor/workflow-actions/require-field/require-field.workflow-action';
import { WorkflowRunModule } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.module';

@Module({
  imports: [
    ApplicationModule,
    RecordCrudModule,
    WorkflowRunModule,
    UserWorkspaceModule,
    UserRoleModule,
    RoleModule,
    WorkflowCommonModule,
  ],
  providers: [WorkflowExecutionContextService, RequireFieldWorkflowAction],
  exports: [RequireFieldWorkflowAction],
})
export class RequireFieldActionModule {}
