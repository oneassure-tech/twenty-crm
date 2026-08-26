import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { modifyRecordFromCache } from '@/object-record/cache/utils/modifyRecordFromCache';
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

    // The answer was written server-side by the workflow, so nothing in the
    // Apollo cache knows about it and the stale value would stay on screen
    // until a reload. Writing the one field we changed straight into the
    // cached record updates the record page, the table cell and the kanban
    // card at once. We deliberately do NOT refetch by query name: that
    // re-runs every active query sharing the name, including record pickers
    // whose filters are momentarily empty, which the API rejects.
    if (isDefined(objectMetadataItem)) {
      modifyRecordFromCache({
        objectMetadataItem,
        cache: apolloCoreClient.cache,
        recordId: submitResult.recordId,
        fieldModifiers: {
          [submitResult.fieldName]: () => submitResult.answer,
        },
      });
    }

    return true;
  };

  return { submitUserPrompt, isSubmittingUserPrompt: loading };
};
