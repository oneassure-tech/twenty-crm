import { describe, expect, it } from 'vitest';

import {
  assertObjectNamePlural,
  assertRecordFilter,
  buildSelectedIdFilter,
  flattenRecord,
  mergeColumns,
  toCsv,
} from 'src/logic-functions/utils/csv';

describe('csv export helpers', () => {
  it('flattens composite fields and skips search vectors', () => {
    expect(
      flattenRecord({
        id: 'abc',
        name: { firstName: 'Ada', lastName: 'Lovelace' },
        searchVector: 'ignored',
        phones: ['+91'],
      }),
    ).toEqual({
      id: 'abc',
      'name.firstName': 'Ada',
      'name.lastName': 'Lovelace',
      phones: '["+91"]',
    });
  });

  it('keeps the first page column order and appends new columns', () => {
    const columns = mergeColumns([], [{ id: '1', name: 'Ada' }]);

    expect(mergeColumns(columns, [{ id: '2', city: 'Pune' }])).toEqual([
      'id',
      'name',
      'city',
    ]);
  });

  it('quotes cells that contain commas or quotes', () => {
    expect(
      toCsv([{ id: '1', note: 'say "hi", please' }], ['id', 'note'], true),
    ).toBe('id,note\n1,"say ""hi"", please"\n');
  });

  it('rejects object names that are not REST plurals', () => {
    expect(assertObjectNamePlural('people')).toBe('people');
    expect(() => assertObjectNamePlural('people?x=1')).toThrow(/REST plural/);
    expect(() => assertObjectNamePlural('exportChunks')).toThrow(/REST plural/);
  });

  it('builds an id filter for the current selection', () => {
    expect(
      buildSelectedIdFilter(['11111111-1111-4111-8111-111111111111']),
    ).toBe('id[eq]:11111111-1111-4111-8111-111111111111');
    expect(
      buildSelectedIdFilter([
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ]),
    ).toBe(
      'or(id[eq]:11111111-1111-4111-8111-111111111111,id[eq]:22222222-2222-4222-8222-222222222222)',
    );
  });

  it('rejects filters with query-breaking characters', () => {
    expect(assertRecordFilter('name.firstName[ilike]:"ada"')).toContain(
      'ilike',
    );
    expect(() => assertRecordFilter('name[eq]:a&limit=1')).toThrow(/Filter/);
  });
});
