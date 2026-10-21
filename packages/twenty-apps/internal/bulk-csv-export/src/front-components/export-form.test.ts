import { describe, expect, it } from 'vitest';

import {
  buildExportFilter,
  describeFilters,
  formatCalendarDate,
  isDateKind,
  operatorsFor,
  parseCatalog,
} from 'src/front-components/export-form';

const companySchema = {
  tags: [
    { name: 'General', description: 'General requests' },
    { name: 'companies', description: 'Object `Companies`' },
    { name: 'calendarEvents', description: 'Object `CalendarEvents`' },
    { name: 'exportJobs', description: 'Object `ExportJobs`' },
  ],
  paths: {
    '/companies': {
      get: {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    data: {
                      properties: {
                        companies: {
                          items: { $ref: '#/components/schemas/CompanyForResponse' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/calendarEvents': {
      get: {
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    data: {
                      properties: {
                        calendarEvents: {
                          items: { $ref: '#/components/schemas/CalendarEventForResponse' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      CompanyForResponse: {
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', description: 'The company name' },
          renewalDate: {
            type: 'string',
            format: 'date-time',
            description: 'Renewal date',
          },
          joinedOn: { type: 'string', format: 'date', description: 'Joined on' },
          status: {
            type: 'string',
            enum: ['RNR', 'CONNECTED'],
            description: 'Status',
          },
          employeeCount: { type: 'integer', description: 'Employees' },
          active: { type: 'boolean', description: 'Active' },
          people: { type: 'array', items: { $ref: '#/components/schemas/Person' } },
          address: {
            type: 'object',
            description: 'Address',
            properties: {
              addressCity: { type: 'string', description: 'City' },
            },
          },
          annualRevenue: {
            type: 'object',
            properties: { amountMicros: { type: 'number' } },
          },
          createdBy: { type: 'object', properties: { source: { type: 'string' } } },
          tags: {
            type: 'array',
            items: { type: 'string', enum: ['A_TEAM', 'B_TEAM'] },
            description: 'Tags',
          },
        },
      },
      CalendarEventForResponse: {
        properties: {
          title: { type: 'string', description: 'Title' },
        },
      },
    },
  },
};

describe('export form', () => {
  const catalog = parseCatalog(companySchema);
  const companies = catalog.find((object) => object.namePlural === 'companies');

  it('lists workspace objects and hides the export tables', () => {
    expect(catalog.map((object) => object.namePlural)).toEqual([
      'calendarEvents',
      'companies',
    ]);
    expect(catalog[0]?.label).toBe('Calendar Events');
    expect(companies?.label).toBe('Companies');
  });

  it('keeps date, choice, and text fields and drops relations', () => {
    expect(companies?.fields.map((field) => [field.path, field.kind, field.group])).toEqual([
      ['joinedOn', 'date', 'Dates'],
      ['renewalDate', 'dateTime', 'Dates'],
      ['active', 'boolean', 'Choices'],
      ['status', 'select', 'Choices'],
      ['tags', 'multiSelect', 'Choices'],
      ['address.addressCity', 'text', 'Other'],
      ['employeeCount', 'number', 'Other'],
      ['name', 'text', 'Other'],
    ]);
    expect(companies?.fields.find((field) => field.path === 'status')?.options).toEqual([
      { value: 'RNR', label: 'RNR' },
      { value: 'CONNECTED', label: 'Connected' },
    ]);
    expect(companies?.fields.find((field) => field.path === 'address.addressCity')?.label).toBe(
      'Address · City',
    );
  });

  it('enables the date picker only for date fields', () => {
    const renewal = companies?.fields.find((field) => field.path === 'renewalDate');
    const name = companies?.fields.find((field) => field.path === 'name');

    expect(isDateKind(renewal?.kind)).toBe(true);
    expect(isDateKind(name?.kind)).toBe(false);
    expect(operatorsFor('dateTime').some((operator) => operator.id === 'on')).toBe(true);
    expect(operatorsFor('text').some((operator) => operator.id === 'on')).toBe(false);
  });

  it('builds a one-day range for a date-time field', () => {
    const start = new Date(2026, 9, 21).toISOString();
    const end = new Date(2026, 9, 22).toISOString();

    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'renewalDate', operator: 'on', value: '2026-10-21' },
      ]),
    ).toBe(`and(renewalDate[gte]:"${start}",renewalDate[lt]:"${end}")`);
    expect(formatCalendarDate('2026-10-21')).toBe('21 Oct 2026');
  });

  it('keeps a calendar date as-is for a date field', () => {
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'joinedOn', operator: 'onOrAfter', value: '2026-10-21' },
        { fieldPath: 'status', operator: 'eq', value: 'RNR' },
        { fieldPath: '', operator: '', value: '' },
      ]),
    ).toBe('and(joinedOn[gte]:"2026-10-21",status[eq]:"RNR")');
  });

  it('builds text, number, choice, and empty filters', () => {
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'name', operator: 'contains', value: 'Ada' },
      ]),
    ).toBe('name[ilike]:"%Ada%"');
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'employeeCount', operator: 'gte', value: '10' },
      ]),
    ).toBe('employeeCount[gte]:10');
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'active', operator: 'eq', value: 'true' },
      ]),
    ).toBe('active[eq]:true');
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'tags', operator: 'includes', value: 'A_TEAM' },
      ]),
    ).toBe('tags[containsAny]:["A_TEAM"]');
    expect(
      buildExportFilter(companies?.fields ?? [], [
        { fieldPath: 'renewalDate', operator: 'empty', value: '' },
      ]),
    ).toBe('renewalDate[is]:NULL');
  });

  it('describes the export in plain language', () => {
    expect(
      describeFilters('Companies', companies?.fields ?? [], [
        { fieldPath: 'renewalDate', operator: 'on', value: '2026-10-21' },
      ]),
    ).toBe('Companies where Renewal date is on 21 Oct 2026');
  });
});
