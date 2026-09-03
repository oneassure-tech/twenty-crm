// An object opts into owner-based visibility by having a relation field with
// this exact name pointing at workspaceMember.
//
// Matching on the name rather than on shape alone is deliberate: several system
// objects (task.assignee, blocklist.workspaceMember, timelineActivity.workspaceMember,
// messageParticipant.workspaceMember) are also MANY_TO_ONE relations to
// workspaceMember, and restricting those would break the app.
export const OWNER_FIELD_NAME = 'owner';
