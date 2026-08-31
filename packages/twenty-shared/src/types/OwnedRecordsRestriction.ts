// Restricts a role to the records it owns, by comparing a foreign key column on
// the object's own table against the current workspace member id.
// `ownerColumnName` is resolved once per workspace cache build from the owner
// field designated on the role's object permission.
export type OwnedRecordsRestriction = {
  ownerColumnName: string;
};
