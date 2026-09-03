import { type RecordVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/types/record-visibility-predicate.type';
import { doesRecordMatchVisibilityPredicate } from 'src/engine/twenty-orm/record-visibility/utils/does-record-match-visibility-predicate.util';

const ownerEqualsMe: RecordVisibilityPredicate = {
  kind: 'field',
  fieldName: 'owner',
  columnName: 'ownerId',
  comparison: { operator: 'equals', value: 'member-1' },
};

const createdByEqualsMe: RecordVisibilityPredicate = {
  kind: 'field',
  fieldName: 'createdBy',
  subFieldName: 'workspaceMemberId',
  columnName: 'createdByWorkspaceMemberId',
  comparison: { operator: 'equals', value: 'member-1' },
};

describe('doesRecordMatchVisibilityPredicate', () => {
  it('should match when the column equals the expected value', () => {
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-1' },
        predicate: ownerEqualsMe,
      }),
    ).toBe(true);
  });

  it('should not match a record owned by someone else', () => {
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-2' },
        predicate: ownerEqualsMe,
      }),
    ).toBe(false);
  });

  it('should not match an unowned record', () => {
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: null },
        predicate: ownerEqualsMe,
      }),
    ).toBe(false);
  });

  it('should match isAnyOf when the value is in the list', () => {
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-2' },
        predicate: {
          kind: 'field',
          fieldName: 'owner',
          columnName: 'ownerId',
          comparison: { operator: 'isAnyOf', values: ['member-1', 'member-2'] },
        },
      }),
    ).toBe(true);
  });

  it('should match isNull only when the column has no value', () => {
    const predicate: RecordVisibilityPredicate = {
      kind: 'field',
      fieldName: 'owner',
      columnName: 'ownerId',
      comparison: { operator: 'isNull' },
    };

    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: null },
        predicate,
      }),
    ).toBe(true);
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-1' },
        predicate,
      }),
    ).toBe(false);
  });

  it('should require every branch of an and group', () => {
    const predicate: RecordVisibilityPredicate = {
      kind: 'and',
      predicates: [ownerEqualsMe, createdByEqualsMe],
    };

    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-1', createdByWorkspaceMemberId: 'member-1' },
        predicate,
      }),
    ).toBe(true);
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-1', createdByWorkspaceMemberId: 'member-2' },
        predicate,
      }),
    ).toBe(false);
  });

  it('should require only one branch of an or group', () => {
    const predicate: RecordVisibilityPredicate = {
      kind: 'or',
      predicates: [ownerEqualsMe, createdByEqualsMe],
    };

    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-2', createdByWorkspaceMemberId: 'member-1' },
        predicate,
      }),
    ).toBe(true);
    expect(
      doesRecordMatchVisibilityPredicate({
        record: { ownerId: 'member-2', createdByWorkspaceMemberId: 'member-2' },
        predicate,
      }),
    ).toBe(false);
  });
});
