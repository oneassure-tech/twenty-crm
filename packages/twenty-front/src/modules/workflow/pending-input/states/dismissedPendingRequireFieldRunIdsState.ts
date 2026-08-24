import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

// Runs the current user has closed the prompt for. Without this, the watcher
// would immediately reopen the modal it just closed, since the run is still
// pending until an answer is submitted.
export const dismissedPendingRequireFieldRunIdsState = createAtomState<
  string[]
>({
  key: 'dismissedPendingRequireFieldRunIdsState',
  defaultValue: [],
});
