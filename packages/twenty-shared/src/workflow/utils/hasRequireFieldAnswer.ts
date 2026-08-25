// Single definition of "this required field has been answered".
//
// Shared on purpose: the server action uses it to decide whether to keep
// waiting, and the frontend uses it to enable Submit. If the two ever
// disagreed, a user could submit an answer the action then refuses to write.
export const hasRequireFieldAnswer = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
};
