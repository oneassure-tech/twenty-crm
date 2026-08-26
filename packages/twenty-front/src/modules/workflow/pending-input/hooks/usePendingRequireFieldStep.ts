import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  findPendingRequireFieldStep,
  type PendingRequireFieldStep,
} from '@/workflow/pending-input/utils/findPendingRequireFieldStep';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';

const PENDING_REQUIRE_FIELD_QUERY_ID = 'pending-require-field-runs';

// Runs waiting on a human are few, and only running ones can be waiting.
const RUNNING_WORKFLOW_RUNS_LIMIT = 30;

const RUNNING_WORKFLOW_RUNS_FILTER = {
  status: { eq: 'RUNNING' },
};

const RECORD_GQL_FIELDS = {
  id: true,
  status: true,
  // createdBy is a composite ACTOR field: it needs its subfields spelled out.
  // Selecting it with `true` produces a selection-less composite and the whole
  // query fails, which would leave this watcher silently seeing no runs.
  createdBy: {
    source: true,
    workspaceMemberId: true,
    name: true,
  },
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

  const isEnabled = isDefined(currentWorkspaceMember);

  const {
    records: workflowRuns,
    refetch,
    objectMetadataItem,
  } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.WorkflowRun,
    filter: RUNNING_WORKFLOW_RUNS_FILTER,
    recordGqlFields: RECORD_GQL_FIELDS,
    limit: RUNNING_WORKFLOW_RUNS_LIMIT,
    skip: !isEnabled,
  });

  // Keeps the underlying records live.
  useListenToEventsForQuery({
    queryId: PENDING_REQUIRE_FIELD_QUERY_ID,
    operationSignature: {
      objectNameSingular: CoreObjectNameSingular.WorkflowRun,
      variables: { filter: RUNNING_WORKFLOW_RUNS_FILTER },
    },
    skip: !isEnabled,
  });

  // A run only enters this list once it starts, so a cache update alone is not
  // enough -- a run that did not match the filter when we fetched would never
  // appear. Refetching on any workflowRun event covers that. Debounced because
  // a single run emits several events in quick succession as it progresses.
  const refetchPendingRuns = useDebouncedCallback(() => {
    if (!isEnabled) {
      return;
    }

    refetch();
  }, 300);

  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: objectMetadataItem?.id,
    onObjectRecordOperationBrowserEvent: refetchPendingRuns,
  });

  const pendingStep = useMemo(() => {
    if (!isDefined(currentWorkspaceMember)) {
      return undefined;
    }

    for (const workflowRun of workflowRuns) {
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
  }, [workflowRuns, currentWorkspaceMember]);

  return { pendingStep };
};
