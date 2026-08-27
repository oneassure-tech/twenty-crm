import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { getObjectTypename } from '@/object-record/cache/utils/getObjectTypename';
import { modifyRecordFromCache } from '@/object-record/cache/utils/modifyRecordFromCache';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SUBMIT_USER_PROMPT } from '@/workflow/workflow-user-prompt/graphql/mutations/submitUserPrompt';
import { useMutation } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';

export type SubmitUserPromptInput = {
  workflowRunId: string;
  stepId: string;
  selectedOptionId: string;
  otherValue?: string;
};

type SubmitUserPromptResult = {
  success: boolean;
  objectNameSingular: string;
  objectNamePlural: string;
  recordId: string;
  fieldName: string;
  answer: string;
};

type SubmitUserPromptMutationResult = {
  submitUserPrompt: SubmitUserPromptResult;
};

export const useSubmitUserPrompt = () => {
  const apolloCoreClient = useApolloCoreClient();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { upsertRecordsInStore } = useUpsertRecordsInStore();

  const [mutate, { loading }] = useMutation<
    SubmitUserPromptMutationResult,
    { input: SubmitUserPromptInput }
  >(SUBMIT_USER_PROMPT, {
    client: apolloCoreClient,
  });

  const submitUserPrompt = async (input: SubmitUserPromptInput) => {
    const result = await mutate({ variables: { input } });
    const submitResult = result?.data?.submitUserPrompt;

    if (submitResult?.success !== true) {
      return false;
    }

    const objectMetadataItem = objectMetadataItems.find(
      (item) => item.nameSingular === submitResult.objectNameSingular,
    );

    if (!isDefined(objectMetadataItem)) {
      return true;
    }

    // The answer was written server-side by the workflow, so the client has no
    // idea it happened. Two places have to learn about it:

    // 1. The Apollo cache, so later reads of this record do not serve the old
    //    value back. We modify the one field rather than refetching by query
    //    name, which would re-run every active query sharing that name.
    modifyRecordFromCache({
      objectMetadataItem,
      cache: apolloCoreClient.cache,
      recordId: submitResult.recordId,
      fieldModifiers: {
        [submitResult.fieldName]: () => submitResult.answer,
      },
    });

    // 2. The Jotai record store, which is what record pages, table cells and
    //    kanban cards actually render from. Without this the new value only
    //    appears once some later query happens to repopulate the store - which
    //    is why the field used to stay stale until the record changed again.
    upsertRecordsInStore({
      partialRecords: [
        {
          id: submitResult.recordId,
          __typename: getObjectTypename(submitResult.objectNameSingular),
          [submitResult.fieldName]: submitResult.answer,
        },
      ],
    });

    return true;
  };

  return { submitUserPrompt, isSubmittingUserPrompt: loading };
};
