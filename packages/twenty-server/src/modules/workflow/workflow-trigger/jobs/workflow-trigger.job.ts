import { Logger, Scope } from '@nestjs/common';

import isEmpty from 'lodash.isempty';
import { FieldActorSource } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { WorkflowVersionStatus } from 'src/modules/workflow/common/standard-objects/workflow-version.workspace-entity';
import { type WorkflowWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow.workspace-entity';
import { WorkflowCommonWorkspaceService } from 'src/modules/workflow/common/workspace-services/workflow-common.workspace-service';
import { WorkflowRunnerWorkspaceService } from 'src/modules/workflow/workflow-runner/workspace-services/workflow-runner.workspace-service';
import { WorkflowTriggerExceptionCode } from 'src/modules/workflow/workflow-trigger/exceptions/workflow-trigger.exception';

export type WorkflowTriggerJobData = {
  workspaceId: string;
  workflowId: string;
  payload: object;
};

// Database events carry the workspace member who caused them. We keep that on
// the run so a step which has to ask a human knows who to ask. Events with no
// member (cron, API keys, imports) simply leave it null and prompt nobody.
const getInitiatorWorkspaceMemberId = (payload: object): string | null => {
  if (!isDefined(payload) || !('workspaceMemberId' in payload)) {
    return null;
  }

  const workspaceMemberId = (payload as { workspaceMemberId?: unknown })
    .workspaceMemberId;

  return typeof workspaceMemberId === 'string' ? workspaceMemberId : null;
};

const DEFAULT_WORKFLOW_NAME = 'Workflow';

@Processor({ queueName: MessageQueue.workflowQueue, scope: Scope.REQUEST })
export class WorkflowTriggerJob {
  private readonly logger = new Logger(WorkflowTriggerJob.name);
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowCommonWorkspaceService: WorkflowCommonWorkspaceService,
    private readonly workflowRunnerWorkspaceService: WorkflowRunnerWorkspaceService,
  ) {}

  @Process(WorkflowTriggerJob.name)
  async handle(data: WorkflowTriggerJobData): Promise<void> {
    const authContext = buildSystemAuthContext(data.workspaceId);

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const workflowRepository =
        await this.globalWorkspaceOrmManager.getRepository<WorkflowWorkspaceEntity>(
          data.workspaceId,
          'workflow',
          { shouldBypassPermissionChecks: true },
        );

      const workflow = await workflowRepository.findOneBy({
        id: data.workflowId,
      });

      if (!workflow) {
        this.logger.error(
          `Workflow ${data.workflowId} not found in workspace ${data.workspaceId}`,
          WorkflowTriggerExceptionCode.NOT_FOUND,
        );

        return;
      }

      if (!workflow.lastPublishedVersionId) {
        this.logger.error(
          `Workflow ${data.workflowId} has no published version in workspace ${data.workspaceId}`,
          WorkflowTriggerExceptionCode.INTERNAL_ERROR,
        );

        return;
      }

      const workflowVersion =
        await this.workflowCommonWorkspaceService.getWorkflowVersionOrFail({
          workspaceId: data.workspaceId,
          workflowVersionId: workflow.lastPublishedVersionId,
        });

      if (workflowVersion.status !== WorkflowVersionStatus.ACTIVE) {
        this.logger.error(
          `Workflow version ${workflowVersion?.id} is not active in workspace ${data.workspaceId}`,
          WorkflowTriggerExceptionCode.INTERNAL_ERROR,
        );

        return;
      }

      await this.workflowRunnerWorkspaceService.run({
        workspaceId: data.workspaceId,
        workflowVersionId: workflow.lastPublishedVersionId,
        payload: data.payload,
        source: {
          source: FieldActorSource.WORKFLOW,
          name:
            isDefined(workflow.name) && !isEmpty(workflow.name)
              ? workflow.name
              : DEFAULT_WORKFLOW_NAME,
          context: {},
          workspaceMemberId: getInitiatorWorkspaceMemberId(data.payload),
        },
      });
    }, authContext);
  }
}
