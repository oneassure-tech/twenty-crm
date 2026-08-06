import { triggerCreateRecordsOptimisticEffect } from '@/apollo/optimistic-effect/utils/triggerCreateRecordsOptimisticEffect';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { getObjectTypename } from '@/object-record/cache/utils/getObjectTypename';
import { getRecordNodeFromRecord } from '@/object-record/cache/utils/getRecordNodeFromRecord';
import { updateRecordFromCache } from '@/object-record/cache/utils/updateRecordFromCache';
import { generateDepthRecordGqlFieldsFromRecord } from '@/object-record/graphql/record-gql-fields/utils/generateDepthRecordGqlFieldsFromRecord';
import { type RecordGqlNode } from '@/object-record/graphql/types/RecordGqlNode';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { useRefetchAggregateQueriesForObjectMetadataItem } from '@/object-record/hooks/useRefetchAggregateQueriesForObjectMetadataItem';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { computeOptimisticRecordFromInput } from '@/object-record/utils/computeOptimisticRecordFromInput';
import { getUnknownRecordInputFields } from '@/object-record/utils/getUnknownRecordInputFields';
import { captureMessage } from '@sentry/react';
import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { useDebouncedCallback } from 'use-debounce';
import {
  DatabaseEventAction,
  type ObjectRecordEvent,
} from '~/generated-metadata/graphql';

export const useTriggerOptimisticEffectFromSseCreateEvents = () => {
  const apolloCoreClient = useApolloCoreClient();
  const { objectMetadataItems } = useObjectMetadataItems();
  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const { refetchAggregateQueriesForObjectMetadataItem } =
    useRefetchAggregateQueriesForObjectMetadataItem();
  const { upsertRecordsInStore } = useUpsertRecordsInStore();

  const debouncedRefetchAggregateQueriesForObjectMetadataItem =
    useDebouncedCallback(refetchAggregateQueriesForObjectMetadataItem, 100);

  const triggerOptimisticEffectFromSseCreateEvents = useCallback(
    ({
      objectRecordEvents,
      objectMetadataItem,
    }: {
      objectRecordEvents: ObjectRecordEvent[];
      objectMetadataItem: EnrichedObjectMetadataItem;
    }) => {
      const createEvents = objectRecordEvents.filter((objectRecordEvent) => {
        return objectRecordEvent.action === DatabaseEventAction.CREATED;
      });

      const cache = apolloCoreClient.cache;
      const recordsToCreate: RecordGqlNode[] = [];

      for (const createEvent of createEvents) {
        const recordFromEvent = createEvent.properties.after;

        if (!isDefined(recordFromEvent)) {
          continue;
        }

        const unknownRecordInputFields = getUnknownRecordInputFields({
          objectMetadataItem,
          recordInput: recordFromEvent,
        });

        if (unknownRecordInputFields.length > 0) {
          captureMessage(
            `SSE create event for ${objectMetadataItem.nameSingular} carried fields unknown to this tab's metadata: ${unknownRecordInputFields.join(', ')}`,
            'warning',
          );
        }

        const sanitizedRecord =
          unknownRecordInputFields.length > 0
            ? Object.fromEntries(
                Object.entries(recordFromEvent).filter(
                  ([recordKey]) =>
                    !unknownRecordInputFields.includes(recordKey),
                ),
              )
            : recordFromEvent;

        const computedOptimisticRecord = {
          ...computeOptimisticRecordFromInput({
            cache: apolloCoreClient.cache,
            objectMetadataItem,
            objectMetadataItems,
            recordInput: sanitizedRecord,
            objectPermissionsByObjectMetadataId,
            currentWorkspaceMember: null,
          }),
          id: sanitizedRecord.id,
          __typename: getObjectTypename(objectMetadataItem.nameSingular),
        };

        const recordGqlFields = generateDepthRecordGqlFieldsFromRecord({
          objectMetadataItem,
          objectMetadataItems,
          record: computedOptimisticRecord,
          depth: 0,
        });

        upsertRecordsInStore({ partialRecords: [sanitizedRecord] });

        updateRecordFromCache({
          objectMetadataItems,
          objectMetadataItem,
          cache: apolloCoreClient.cache,
          record: computedOptimisticRecord,
          recordGqlFields,
          objectPermissionsByObjectMetadataId,
        });

        const recordWithConnection = getRecordNodeFromRecord({
          record: computedOptimisticRecord,
          objectMetadataItem,
          objectMetadataItems,
          recordGqlFields,
        });

        if (isDefined(recordWithConnection)) {
          recordsToCreate.push(recordWithConnection);
        }
      }

      if (recordsToCreate.length === 0) {
        return;
      }

      triggerCreateRecordsOptimisticEffect({
        cache,
        objectMetadataItem,
        recordsToCreate,
        objectMetadataItems,
        shouldMatchRootQueryFilter: true,
        checkForRecordInCache: true,
        objectPermissionsByObjectMetadataId,
        upsertRecordsInStore,
      });

      debouncedRefetchAggregateQueriesForObjectMetadataItem({
        objectMetadataItem,
      });
    },
    [
      apolloCoreClient.cache,
      objectMetadataItems,
      objectPermissionsByObjectMetadataId,
      upsertRecordsInStore,
      debouncedRefetchAggregateQueriesForObjectMetadataItem,
    ],
  );

  return {
    triggerOptimisticEffectFromSseCreateEvents,
  };
};
