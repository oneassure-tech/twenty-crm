import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { type ObjectRecordOperationBrowserEventDetail } from '@/browser-event/types/ObjectRecordOperationBrowserEventDetail';
import { useGetRecordBoardEffectsForUpdateInputs } from '@/object-record/record-board/hooks/useGetRecordBoardEffectsForUpdateInputs';
import { useRemoveRecordsFromBoard } from '@/object-record/record-board/hooks/useRemoveRecordsFromBoard';
import { useRepositionRecordsOnBoard } from '@/object-record/record-board/hooks/useRepositionRecordsOnBoard';
import { useTriggerRecordBoardInitialQuery } from '@/object-record/record-board/hooks/useTriggerRecordBoardInitialQuery';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { useCallback } from 'react';
import { assertUnreachable } from 'twenty-shared/utils';

export const RecordBoardDataChangedEffect = () => {
  const { objectMetadataItem } = useRecordIndexContextOrThrow();
  const { triggerRecordBoardInitialQuery } =
    useTriggerRecordBoardInitialQuery();
  const { getRecordBoardEffectsForUpdateInputs } =
    useGetRecordBoardEffectsForUpdateInputs();
  const { repositionRecordsOnBoard } = useRepositionRecordsOnBoard();

  const { removeRecordsFromBoard } = useRemoveRecordsFromBoard();

  const handleObjectRecordOperation = useCallback(
    (
      objectRecordOperationEventDetail: ObjectRecordOperationBrowserEventDetail,
    ) => {
      const objectRecordOperation = objectRecordOperationEventDetail.operation;

      switch (objectRecordOperation.type) {
        case 'update-one':
        case 'update-many':
          {
            const updateInputs =
              objectRecordOperation.type === 'update-one'
                ? [objectRecordOperation.result.updateInput]
                : objectRecordOperation.result.updateInputs;

            const recordBoardUpdateEffect =
              getRecordBoardEffectsForUpdateInputs(updateInputs);

            switch (recordBoardUpdateEffect) {
              case 'trigger-initial-query': {
                triggerRecordBoardInitialQuery({ shouldResetScroll: false });
                break;
              }
              case 'reposition-records': {
                const allRecordsRepositioned =
                  repositionRecordsOnBoard(updateInputs);

                if (!allRecordsRepositioned) {
                  triggerRecordBoardInitialQuery({ shouldResetScroll: false });
                }
                break;
              }
              case 'none': {
                break;
              }
              default: {
                assertUnreachable(recordBoardUpdateEffect);
              }
            }
          }
          break;
        case 'create-one':
        case 'create-many': {
          triggerRecordBoardInitialQuery({ shouldResetScroll: false });
          break;
        }
        case 'delete-one': {
          const removedRecordId = objectRecordOperation.deletedRecordId;

          removeRecordsFromBoard({
            recordIdsToRemove: [removedRecordId],
          });
          return;
        }
        case 'delete-many': {
          const removedRecordIds = objectRecordOperation.deletedRecordIds;

          removeRecordsFromBoard({
            recordIdsToRemove: removedRecordIds,
          });
          return;
        }
        case 'restore-many':
        case 'restore-one': {
          return;
        }
        default: {
          triggerRecordBoardInitialQuery({ shouldResetScroll: false });
        }
      }
    },
    [
      triggerRecordBoardInitialQuery,
      getRecordBoardEffectsForUpdateInputs,
      repositionRecordsOnBoard,
      removeRecordsFromBoard,
    ],
  );

  useListenToObjectRecordOperationBrowserEvent({
    onObjectRecordOperationBrowserEvent: handleObjectRecordOperation,
    objectMetadataItemId: objectMetadataItem.id,
  });

  return null;
};
