import { Module } from '@nestjs/common';

import { ApplicationModule } from 'src/engine/core-modules/application/application.module';
import { RecordCrudModule } from 'src/engine/core-modules/record-crud/record-crud.module';
import { UserWorkspaceModule } from 'src/engine/core-modules/user-workspace/user-workspace.module';
import { RoleModule } from 'src/engine/metadata-modules/role/role.module';
import { UserRoleModule } from 'src/engine/metadata-modules/user-role/user-role.module';
import { WorkflowCommonModule } from 'src/modules/workflow/common/workflow-common.module';
import { WorkflowExecutionContextService } from 'src/modules/workflow/workflow-executor/services/workflow-execution-context.service';
import { WorkflowRunModule } from 'src/modules/workflow/workflow-runner/workflow-run/workflow-run.module';
import { WorkflowRunnerModule } from 'src/modules/workflow/workflow-runner/workflow-runner.module';
import { WorkflowUserPromptWorkspaceService } from 'src/modules/workflow/workflow-user-prompt/workflow-user-prompt.workspace-service';

@Module({
  imports: [
    ApplicationModule,
    RecordCrudModule,
    WorkflowRunModule,
    WorkflowRunnerModule,
    UserWorkspaceModule,
    UserRoleModule,
    RoleModule,
    WorkflowCommonModule,
  ],
  providers: [WorkflowExecutionContextService, WorkflowUserPromptWorkspaceService],
  exports: [WorkflowUserPromptWorkspaceService],
})
export class WorkflowUserPromptModule {}
