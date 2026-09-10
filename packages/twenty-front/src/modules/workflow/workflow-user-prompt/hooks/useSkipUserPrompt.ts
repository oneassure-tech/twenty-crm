import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { SKIP_USER_PROMPT } from '@/workflow/workflow-user-prompt/graphql/mutations/skipUserPrompt';
import { useMutation } from '@apollo/client/react';

export type SkipUserPromptInput = {
  workflowRunId: string;
  stepId: string;
};

type SkipUserPromptMutationResult = {
  skipUserPrompt: { success: boolean };
};

// Closing a question skips its step server-side. A purely client-side close
// would not hold: the step stays pending, so the next poll would reopen the
// same question.
export const useSkipUserPrompt = () => {
  const apolloCoreClient = useApolloCoreClient();

  const [mutate, { loading }] = useMutation<
    SkipUserPromptMutationResult,
    { input: SkipUserPromptInput }
  >(SKIP_USER_PROMPT, {
    client: apolloCoreClient,
  });

  const skipUserPrompt = async (input: SkipUserPromptInput) => {
    const result = await mutate({ variables: { input } });

    return result?.data?.skipUserPrompt.success === true;
  };

  return { skipUserPrompt, isSkippingUserPrompt: loading };
};
