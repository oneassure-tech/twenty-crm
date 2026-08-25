import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { FIND_MY_PENDING_REQUIRED_FIELDS } from '@/workflow/pending-input/graphql/queries/findMyPendingRequiredFields';
import { type PendingRequiredField } from '@/workflow/pending-input/types/PendingRequiredField';
import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';

// A workflow run is created by a background job after the write returns, so
// there is nothing to find at the moment the user acts. These control a short
// burst of re-checks that covers the gap between the write and the run parking.
const POLL_INTERVAL_IN_MS = 1_500;
const POLL_DURATION_IN_MS = 12_000;

const WRITE_OPERATION_TYPES = [
  'update-one',
  'update-many',
  'create-one',
  'create-many',
] as const;

// Finds a required field parked waiting on the current user, so the app can
// prompt them wherever they are instead of making them dig through Workflow
// Runs to find it.
//
// Reads through a dedicated endpoint rather than querying workflowRun records
// directly: Twenty gates all workflow objects behind the WORKFLOWS settings
// permission, so the record query returned nothing for ordinary members and the
// prompt silently never appeared for them.
//
// That switch removed two helpers this hook used to need:
//   - findPendingRequireFieldStep, which dug the pending step out of a run's
//     state JSON. The server now returns the step directly.
//   - useRequireFieldWatchedObjectNames, which listed active workflow versions
//     so polling could be limited to objects a workflow actually watched. It
//     existed to stop the old, expensive run query firing after every write;
//     this endpoint returns an empty list cheaply, so the gate is not worth its
//     own permission-gated query.
export const usePendingRequireFieldStep = (): {
  pendingStep: PendingRequiredField | undefined;
  refetchPendingSteps: () => void;
} => {
  const apolloCoreClient = useApolloCoreClient();

  const { data, refetch } = useQuery<{
    findMyPendingRequiredFields: PendingRequiredField[];
  }>(FIND_MY_PENDING_REQUIRED_FIELDS, {
    client: apolloCoreClient,
    fetchPolicy: 'network-only',
  });

  const pendingStep = data?.findMyPendingRequiredFields?.[0];

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadlineRef = useRef<number>(0);

  // Polling is deliberately time-boxed rather than continuous. It only has to
  // survive the gap between the user's write and the run parking, so it winds
  // itself down instead of running for the life of the session.
  const stopPolling = useCallback(() => {
    if (isDefined(pollIntervalRef.current)) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    // Pushing the deadline out on every write means rapid edits extend the
    // window rather than each starting a competing interval.
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
  }, [refetch, stopPolling]);

  useListenToObjectRecordOperationBrowserEvent({
    operationTypes: [...WRITE_OPERATION_TYPES],
    onObjectRecordOperationBrowserEvent: startPolling,
  });

  // Unmounting mid-window would otherwise leave the interval running.
  useEffect(() => stopPolling, [stopPolling]);

  // The prompt is up, so the thing polling was waiting for has arrived.
  useEffect(() => {
    if (isDefined(pendingStep)) {
      stopPolling();
    }
  }, [pendingStep, stopPolling]);

  return {
    pendingStep,
    refetchPendingSteps: refetch,
  };
};
