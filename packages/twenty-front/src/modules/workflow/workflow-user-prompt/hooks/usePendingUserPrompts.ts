import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { PENDING_USER_PROMPTS_POLL_INTERVAL_IN_MS } from '@/workflow/workflow-user-prompt/constants/PendingUserPromptsPollIntervalInMs';
import { PENDING_USER_PROMPTS } from '@/workflow/workflow-user-prompt/graphql/queries/pendingUserPrompts';
import { type PendingUserPrompt } from '@/workflow/workflow-user-prompt/types/PendingUserPrompt';
import { useQuery } from '@apollo/client/react';
import { isDefined } from 'twenty-shared/utils';

type PendingUserPromptsQueryResult = {
  pendingUserPrompts: PendingUserPrompt[];
};

export const usePendingUserPrompts = () => {
  const apolloCoreClient = useApolloCoreClient();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);

  const { data, refetch } = useQuery<PendingUserPromptsQueryResult>(
    PENDING_USER_PROMPTS,
    {
      client: apolloCoreClient,
      skip: !isDefined(currentWorkspaceMember),
      pollInterval: PENDING_USER_PROMPTS_POLL_INTERVAL_IN_MS,
      // A background tab has nobody looking at it; resume polling on focus.
      skipPollAttempt: () => document.visibilityState === 'hidden',
      fetchPolicy: 'network-only',
    },
  );

  return {
    pendingUserPrompts: data?.pendingUserPrompts ?? [],
    refetchPendingUserPrompts: refetch,
  };
};
