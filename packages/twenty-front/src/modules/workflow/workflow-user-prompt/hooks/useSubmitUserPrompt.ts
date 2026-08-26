import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useRefetchAggregateQueries } from '@/object-record/hooks/useRefetchAggregateQueries';
import { SUBMIT_USER_PROMPT } from '@/workflow/workflow-user-prompt/graphql/mutations/submitUserPrompt';
import { useMutation } from '@apollo/client/react';
import { capitalize } from 'twenty-shared/utils';

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
};

type SubmitUserPromptMutationResult = {
  submitUserPrompt: SubmitUserPromptResult;
};

export const useSubmitUserPrompt = () => {
  const apolloCoreClient = useApolloCoreClient();
  const { refetchAggregateQueries } = useRefetchAggregateQueries();

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

    // The answer was written server-side by the workflow, so nothing in the
    // Apollo cache knows about it. Refreshing the record and list queries for
    // the touched object is what lets the new value appear straight away -
    // otherwise the user has to reload the page to see what they just saved.
    await apolloCoreClient.refetchQueries({
      include: [
        `FindOne${capitalize(submitResult.objectNameSingular)}`,
        `FindMany${capitalize(submitResult.objectNamePlural)}`,
      ],
    });

    // Kanban column totals and any count chips are separate queries.
    await refetchAggregateQueries({
      objectMetadataNamePlural: submitResult.objectNamePlural,
    });

    return true;
  };

  return { submitUserPrompt, isSubmittingUserPrompt: loading };
};
