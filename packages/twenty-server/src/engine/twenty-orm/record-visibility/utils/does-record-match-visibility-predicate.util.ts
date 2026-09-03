import { isDefined } from 'twenty-shared/utils';

import {
  type RecordVisibilityComparison,
  type RecordVisibilityPredicate,
} from 'src/engine/twenty-orm/record-visibility/types/record-visibility-predicate.type';

const compare = (
  recordValue: unknown,
  comparison: RecordVisibilityComparison,
): boolean => {
  switch (comparison.operator) {
    case 'equals':
      return recordValue === comparison.value;
    case 'isAnyOf':
      return (
        typeof recordValue === 'string' &&
        comparison.values.includes(recordValue)
      );
    case 'isNull':
      return !isDefined(recordValue);
  }
};

// In-memory counterpart of the SQL adapter, used by the subscription publisher
// where there is no query to filter - only a materialised record to accept or
// reject.
export const doesRecordMatchVisibilityPredicate = ({
  record,
  predicate,
}: {
  record: Record<string, unknown>;
  predicate: RecordVisibilityPredicate;
}): boolean => {
  switch (predicate.kind) {
    case 'field':
      return compare(record[predicate.columnName], predicate.comparison);
    case 'and':
      return predicate.predicates.every((childPredicate) =>
        doesRecordMatchVisibilityPredicate({
          record,
          predicate: childPredicate,
        }),
      );
    case 'or':
      return predicate.predicates.some((childPredicate) =>
        doesRecordMatchVisibilityPredicate({
          record,
          predicate: childPredicate,
        }),
      );
  }
};
