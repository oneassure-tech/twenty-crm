import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useRequireFieldWatchedObjectNames } from '@/workflow/pending-input/hooks/useRequireFieldWatchedObjectNames';
import {
  findPendingRequireFieldStep,
  type PendingRequireFieldStep,
} from '@/workflow/pending-input/utils/findPendingRequireFieldStep';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const PENDING_REQUIRE_FIELD_QUERY_ID = 'pending-require-field-runs';

// Runs waiting on a human are few, and only running ones can be waiting.
const RUNNING_WORKFLOW_RUNS_LIMIT = 30;

// A workflow run is created by a background job after the write returns, so
// there is nothing to find at the moment the user acts. These control a short
// burst of re-checks that covers the gap between the write and the run parking.
const POLL_INTERVAL_IN_MS = 1_500;
const POLL_DURATION_IN_MS = 12_000;

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

const WRITE_OPERATION_TYPES = [
  'update-one',
  'update-many',
  'create-one',
  'create-many',
] as const;

/**
 * Watches for a REQUIRE_FIELD step waiting on the current user.
 *
 * Inert unless a published workflow can actually ask for a required field, and
 * even then it only reacts to writes on the objects those workflows watch.
 *
 * The status filter runs server-side; ownership is matched here rather than in
 * the filter because `createdBy.workspaceMemberId` is hidden from generated
 * input types. The set is small enough that this costs nothing.
 */
export const usePendingRequireFieldStep = (): {
  pendingStep: PendingRequireFieldStep | undefined;
} => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { watchedObjectNameSingulars } = useRequireFieldWatchedObjectNames();

  // Nothing to watch for unless a published workflow can actually ask for a
  // required field. Keeps this completely idle for everyone else.
  const isEnabled =
    isDefined(currentWorkspaceMember) && watchedObjectNameSingulars.size > 0;

  const { records: workflowRuns, refetch } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.WorkflowRun,
    filter: RUNNING_WORKFLOW_RUNS_FILTER,
    recordGqlFields: RECORD_GQL_FIELDS,
    limit: RUNNING_WORKFLOW_RUNS_LIMIT,
    skip: !isEnabled,
  });

  // Keeps already-loaded runs live.
  useListenToEventsForQuery({
    queryId: PENDING_REQUIRE_FIELD_QUERY_ID,
    operationSignature: {
      objectNameSingular: CoreObjectNameSingular.WorkflowRun,
      variables: { filter: RUNNING_WORKFLOW_RUNS_FILTER },
    },
    skip: !isEnabled,
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (isDefined(pollIntervalRef.current)) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // A write to a watched object may have just started a run, and that run only
  // appears a moment later. Re-check for a short window; writes to any other
  // object are ignored so this stays quiet during normal use.
  const startPolling = useCallback(
    (objectNameSingular: string) => {
      if (!isEnabled || !watchedObjectNameSingulars.has(objectNameSingular)) {
        return;
      }

      pollDeadlineRef.current = Date.now() + POLL_DURATION_IN_MS;

      if (isDefined(pollIntervalRef.current)) {
        return;
      }

      pollIntervalRef.current = setInterval(() => {
        if (Date.now() > pollDeadlineRef.current) {
          stopPolling();

          return;
        }

        refetch();
      }, POLL_INTERVAL_IN_MS);
    },
    [isEnabled, watchedObjectNameSingulars, refetch, stopPolling],
  );

  useListenToObjectRecordOperationBrowserEvent({
    operationTypes: [...WRITE_OPERATION_TYPES],
    onObjectRecordOperationBrowserEvent: (detail) =>
      startPolling(detail.objectMetadataItem.nameSingular),
  });

  useEffect(() => stopPolling, [stopPolling]);

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

  // Nothing more to wait for once the prompt is up.
  useEffect(() => {
    if (isDefined(pendingStep)) {
      stopPolling();
    }
  }, [pendingStep, stopPolling]);

  return { pendingStep };
};
