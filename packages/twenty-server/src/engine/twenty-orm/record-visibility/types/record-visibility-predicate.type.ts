// Intermediate representation for record-visibility rules.
//
// Rules describe *what* to restrict in these terms; two adapters translate it:
//   - apply-record-visibility-predicate-to-query-builder.util.ts -> SQL
//   - does-record-match-visibility-predicate.util.ts             -> in-memory boolean
//
// Keeping the shape deliberately narrow is what lets both adapters stay
// exhaustive: adding a variant fails to compile until both handle it.
export type RecordVisibilityComparison =
  | { operator: 'equals'; value: string | null }
  | { operator: 'isAnyOf'; values: string[] }
  | { operator: 'isNull' };

export type RecordVisibilityFieldPredicate = {
  kind: 'field';
  // Metadata field name, e.g. 'owner' or 'createdBy'.
  fieldName: string;
  // Composite sub-field, e.g. 'workspaceMemberId' on an ACTOR field.
  subFieldName?: string;
  // Physical column, e.g. 'ownerId'. Used for in-memory matching, and as the
  // filter key for non-composite fields so we compare the local column rather
  // than joining the related table.
  columnName: string;
  comparison: RecordVisibilityComparison;
};

export type RecordVisibilityPredicate =
  | RecordVisibilityFieldPredicate
  | { kind: 'and'; predicates: RecordVisibilityPredicate[] }
  | { kind: 'or'; predicates: RecordVisibilityPredicate[] };
