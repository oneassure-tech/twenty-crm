import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { dismissedPendingRequireFieldRunIdsState } from '@/workflow/pending-input/states/dismissedPendingRequireFieldRunIdsState';
import {
  findPendingRequireFieldStep,
  type PendingRequireFieldStep,
} from '@/workflow/pending-input/utils/findPendingRequireFieldStep';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const PENDING_REQUIRE_FIELD_QUERY_ID = 'pending-require-field-runs';

// Runs waiting on a human are few, and only running ones can be waiting.
const RUNNING_WORKFLOW_RUNS_LIMIT = 30;

const RUNNING_WORKFLOW_RUNS_FILTER = {
  status: { eq: 'RUNNING' },
};

const RECORD_GQL_FIELDS = {
  id: true,
  status: true,
  createdBy: true,
  state: true,
};

/**
 * Watches for a REQUIRE_FIELD step waiting on the current user.
 *
 * The status filter runs server-side; ownership is matched here rather than in
 * the filter because `createdBy.workspaceMemberId` is hidden from generated
 * input types. The set is small enough that this costs nothing.
 */
export const usePendingRequireFieldStep = (): {
  pendingStep: PendingRequireFieldStep | undefined;
} => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const dismissedRunIds = useAtomStateValue(
    dismissedPendingRequireFieldRunIdsState,
  );

  const { records: workflowRuns } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.WorkflowRun,
    filter: RUNNING_WORKFLOW_RUNS_FILTER,
    recordGqlFields: RECORD_GQL_FIELDS,
    limit: RUNNING_WORKFLOW_RUNS_LIMIT,
    skip: !isDefined(currentWorkspaceMember),
  });

  // Keeps the list live, so the prompt shows up as soon as the run parks
  // instead of on the next page load.
  useListenToEventsForQuery({
    queryId: PENDING_REQUIRE_FIELD_QUERY_ID,
    operationSignature: {
      objectNameSingular: CoreObjectNameSingular.WorkflowRun,
      variables: { filter: RUNNING_WORKFLOW_RUNS_FILTER },
    },
    skip: !isDefined(currentWorkspaceMember),
  });

  const pendingStep = useMemo(() => {
    if (!isDefined(currentWorkspaceMember)) {
      return undefined;
    }

    const dismissedRunIdsSet = new Set(dismissedRunIds);

    for (const workflowRun of workflowRuns) {
      if (dismissedRunIdsSet.has(workflowRun.id)) {
        continue;
      }

      if (
        workflowRun.createdBy?.workspaceMemberId !== currentWorkspaceMember.id
      ) {
        continue;
      }

      const found = findPendingRequireFieldStep(workflowRun);

      if (isDefined(found)) {
        return found;
      }
    }

    return undefined;
  }, [workflowRuns, currentWorkspaceMember, dismissedRunIds]);

  return { pendingStep };
};
