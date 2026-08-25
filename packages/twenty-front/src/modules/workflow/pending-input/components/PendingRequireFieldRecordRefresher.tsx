import { useLazyFindOneRecord } from '@/object-record/hooks/useLazyFindOneRecord';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useEffect, useRef } from 'react';
import { isDefined } from 'twenty-shared/utils';

// The workflow writes the answer from a background job, so the record is not
// updated yet when the mutation returns. These re-reads cover that gap.
const REFRESH_DELAYS_IN_MS = [800, 2_000, 4_000, 7_000, 11_000];

type PendingRequireFieldRecordRefresherProps = {
  objectNameSingular: string;
  recordId: string;
  fieldName: string;
  onRefreshed: () => void;
};

// Pulls the freshly written record back into the cache after a required field
// is submitted.
//
// Added because submitting only queues the write: a background worker performs
// it a second or two later, so the page was still showing the old, empty value
// and users had to refresh by hand to see their answer.
//
// Lives outside the modal on purpose. The modal unmounts the instant you
// submit, which would kill these re-reads before the first one ran.
export const PendingRequireFieldRecordRefresher = ({
  objectNameSingular,
  recordId,
  fieldName,
  onRefreshed,
}: PendingRequireFieldRecordRefresherProps) => {
  const { findOneRecord } = useLazyFindOneRecord({
    objectNameSingular,
    fetchPolicy: 'network-only',
  });

  const { upsertRecordsInStore } = useUpsertRecordsInStore();

  // Held in refs so the effect below depends only on the record being watched.
  // These callbacks get a new identity every render, and listing them as
  // dependencies would restart the re-reads constantly.
  const findOneRecordRef = useRef(findOneRecord);
  const upsertRecordsInStoreRef = useRef(upsertRecordsInStore);
  const onRefreshedRef = useRef(onRefreshed);

  findOneRecordRef.current = findOneRecord;
  upsertRecordsInStoreRef.current = upsertRecordsInStore;
  onRefreshedRef.current = onRefreshed;

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let isDone = false;

    const clearPendingTimeouts = () => {
      for (const timeout of timeouts) {
        clearTimeout(timeout);
      }
    };

    for (const delay of REFRESH_DELAYS_IN_MS) {
      timeouts.push(
        setTimeout(async () => {
          if (isDone) {
            return;
          }

          await findOneRecordRef.current({
            objectRecordId: recordId,
            onCompleted: (record) => {
              upsertRecordsInStoreRef.current({ partialRecords: [record] });

              // The value landed, so there is nothing left to wait for.
              if (isDefined(record[fieldName])) {
                isDone = true;
                clearPendingTimeouts();
                onRefreshedRef.current();
              }
            },
          });
        }, delay),
      );
    }

    // Navigating away mid-wait would otherwise leave timeouts queued against an
    // unmounted component.
    return () => {
      isDone = true;
      clearPendingTimeouts();
    };
  }, [recordId, fieldName]);

  return null;
};
