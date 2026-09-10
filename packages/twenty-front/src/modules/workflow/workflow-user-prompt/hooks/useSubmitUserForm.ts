import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { getObjectTypename } from '@/object-record/cache/utils/getObjectTypename';
import { modifyRecordFromCache } from '@/object-record/cache/utils/modifyRecordFromCache';
import { useUpsertRecordsInStore } from '@/object-record/record-store/hooks/useUpsertRecordsInStore';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { SUBMIT_USER_FORM } from '@/workflow/workflow-user-prompt/graphql/mutations/submitUserForm';
import { useMutation } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';

export type SubmitUserFormInput = {
  workflowRunId: string;
  stepId: string;
  answers: Record<string, unknown>;
};

type SubmitUserFormResult = {
  success: boolean;
  objectNameSingular: string;
  objectNamePlural: string;
  recordId: string;
  answers: Record<string, unknown>;
};

type SubmitUserFormMutationResult = {
  submitUserForm: SubmitUserFormResult;
};

export const useSubmitUserForm = () => {
  const apolloCoreClient = useApolloCoreClient();
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);
  const { upsertRecordsInStore } = useUpsertRecordsInStore();

  const [mutate, { loading }] = useMutation<
    SubmitUserFormMutationResult,
    { input: SubmitUserFormInput }
  >(SUBMIT_USER_FORM, {
    client: apolloCoreClient,
  });

  const submitUserForm = async (input: SubmitUserFormInput) => {
    const result = await mutate({ variables: { input } });
    const submitResult = result?.data?.submitUserForm;

    if (submitResult?.success !== true) {
      return false;
    }

    const objectMetadataItem = objectMetadataItems.find(
      (item) => item.nameSingular === submitResult.objectNameSingular,
    );

    if (!isDefined(objectMetadataItem)) {
      return true;
    }

    const writtenAnswers = Object.entries(submitResult.answers);

    if (writtenAnswers.length === 0) {
      return true;
    }

    // The answers were written server-side by the workflow, so the client has
    // no idea it happened. Two places have to learn about it:

    // 1. The Apollo cache, so later reads of this record do not serve the old
    //    values back. We modify the answered fields rather than refetching by
    //    query name, which would re-run every active query sharing that name.
    modifyRecordFromCache({
      objectMetadataItem,
      cache: apolloCoreClient.cache,
      recordId: submitResult.recordId,
      fieldModifiers: Object.fromEntries(
        writtenAnswers.map(([fieldName, answer]) => [fieldName, () => answer]),
      ),
    });

    // 2. The Jotai record store, which is what record pages, table cells and
    //    kanban cards actually render from. Without this the new values only
    //    appear once some later query happens to repopulate the store.
    upsertRecordsInStore({
      partialRecords: [
        {
          id: submitResult.recordId,
          __typename: getObjectTypename(submitResult.objectNameSingular),
          ...submitResult.answers,
        },
      ],
    });

    return true;
  };

  return { submitUserForm, isSubmittingUserForm: loading };
};
