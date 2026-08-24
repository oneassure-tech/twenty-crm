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

/**
 * Pulls the freshly written record back into the cache after a required field
 * is submitted, so the value shows up without a manual refresh.
 *
 * Mounted only while a refresh is outstanding, and keyed on the record, so the
 * object name stays fixed for its whole lifetime.
 */
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

  // Held in refs so the polling effect depends only on the record it is
  // watching, not on callbacks that change identity every render.
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

    return () => {
      isDone = true;
      clearPendingTimeouts();
    };
  }, [recordId, fieldName]);

  return null;
};
