// A workflow run is enqueued, so the prompt appears a moment after the record
// change. This is the delay between that change and the modal showing up, and
// it is the part of that wait we control - the rest is the worker picking the
// run up.
export const PENDING_USER_PROMPTS_POLL_INTERVAL_IN_MS = 1_500;
