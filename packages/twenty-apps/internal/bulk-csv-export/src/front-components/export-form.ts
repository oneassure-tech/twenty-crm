import { assertRecordFilter } from 'src/logic-functions/utils/csv';

export type FieldKind =
  | 'text'
  | 'number'
  | 'date'
  | 'dateTime'
  | 'select'
  | 'multiSelect'
  | 'boolean';

export type FieldOption = {
  value: string;
  label: string;
};

export type CatalogField = {
  path: string;
  label: string;
  kind: FieldKind;
  group: 'Dates' | 'Choices' | 'Other';
  options?: FieldOption[];
};

export type CatalogObject = {
  namePlural: string;
  label: string;
  fields: CatalogField[];
};

export type FilterDraft = {
  fieldPath: string;
  operator: string;
  value: string;
};

export type OperatorChoice = {
  id: string;
  label: string;
  needsValue: boolean;
};

type SchemaProperty = {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: {
    type?: string;
    enum?: string[];
    $ref?: string;
  };
};

type OpenApiDocument = {
  tags?: { name?: string; description?: string }[];
  paths?: Record<string, { get?: { responses?: Record<string, unknown> } }>;
  components?: { schemas?: Record<string, { properties?: Record<string, SchemaProperty> }> };
};

const OBJECT_NAME = /^[A-Za-z][A-Za-z0-9]*$/;
const FIELD_PATH = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)?$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const NUMBER_VALUE = /^-?\d+(\.\d+)?$/;
const SAFE_TEXT = /^[A-Za-z0-9_.,:() \-]+$/;
const SKIPPED_FIELDS = new Set([
  'id',
  'position',
  'deletedAt',
  'searchVector',
  'createdBy',
  'updatedBy',
]);
const HIDDEN_OBJECTS = new Set(['exportJobs', 'exportChunks']);
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const TEXT_OPERATORS: OperatorChoice[] = [
  { id: 'contains', label: 'Contains', needsValue: true },
  { id: 'eq', label: 'Is', needsValue: true },
  { id: 'neq', label: 'Is not', needsValue: true },
  { id: 'startsWith', label: 'Starts with', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

const NUMBER_OPERATORS: OperatorChoice[] = [
  { id: 'eq', label: 'Is', needsValue: true },
  { id: 'neq', label: 'Is not', needsValue: true },
  { id: 'gt', label: 'Greater than', needsValue: true },
  { id: 'gte', label: 'At least', needsValue: true },
  { id: 'lt', label: 'Less than', needsValue: true },
  { id: 'lte', label: 'At most', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

const DATE_OPERATORS: OperatorChoice[] = [
  { id: 'on', label: 'Is on', needsValue: true },
  { id: 'before', label: 'Is before', needsValue: true },
  { id: 'after', label: 'Is after', needsValue: true },
  { id: 'onOrBefore', label: 'Is on or before', needsValue: true },
  { id: 'onOrAfter', label: 'Is on or after', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

const SELECT_OPERATORS: OperatorChoice[] = [
  { id: 'eq', label: 'Is', needsValue: true },
  { id: 'neq', label: 'Is not', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

const MULTI_SELECT_OPERATORS: OperatorChoice[] = [
  { id: 'includes', label: 'Includes', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

const BOOLEAN_OPERATORS: OperatorChoice[] = [
  { id: 'eq', label: 'Is', needsValue: true },
  { id: 'empty', label: 'Is empty', needsValue: false },
  { id: 'notEmpty', label: 'Is not empty', needsValue: false },
];

export const humanize = (value: string): string => {
  if (value === value.toUpperCase() && value.length <= 5 && !value.includes('_')) {
    return value;
  }

  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!spaced) {
    return value;
  }

  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const readable = (value: string | undefined, fallback: string): string => {
  const description = value?.trim() ?? '';

  if (description.length > 0 && description.length <= 80) {
    return description;
  }

  return humanize(fallback);
};

const objectLabel = (description: string | undefined, namePlural: string): string => {
  const match = description?.match(/`([^`]+)`/);
  const raw = match?.[1]?.trim() || namePlural;

  if (raw.includes(' ')) {
    return raw;
  }

  return raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
};

const childLabel = (
  parentName: string,
  childName: string,
  description: string | undefined,
): string => {
  if (description && description.trim().length > 0 && description.trim().length <= 80) {
    return description.trim();
  }

  const prefix = parentName.toLowerCase();
  const stripped = childName.toLowerCase().startsWith(prefix)
    ? childName.slice(parentName.length)
    : childName;

  return humanize(stripped || childName);
};

const optionLabel = (value: string): string => humanize(value);

const isSafeOption = (value: string): boolean => SAFE_TEXT.test(value);

const kindForScalar = (property: SchemaProperty): FieldKind | undefined => {
  if (property.enum && property.enum.length > 0) {
    return 'select';
  }

  if (property.format === 'date') {
    return 'date';
  }

  if (property.format === 'date-time') {
    return 'dateTime';
  }

  if (property.format === 'uuid' || property.format === 'uri') {
    return undefined;
  }

  if (property.type === 'boolean') {
    return 'boolean';
  }

  if (property.type === 'integer' || property.type === 'number') {
    return 'number';
  }

  if (property.type === 'string') {
    return 'text';
  }

  return undefined;
};

const groupFor = (kind: FieldKind): CatalogField['group'] => {
  if (kind === 'date' || kind === 'dateTime') {
    return 'Dates';
  }

  if (kind === 'select' || kind === 'multiSelect' || kind === 'boolean') {
    return 'Choices';
  }

  return 'Other';
};

const fieldFromProperty = (
  path: string,
  label: string,
  property: SchemaProperty,
): CatalogField | undefined => {
  if (property.type === 'array' && property.items?.enum) {
    const options = property.items.enum.filter(isSafeOption).map((value) => ({
      value,
      label: optionLabel(value),
    }));

    if (options.length === 0) {
      return undefined;
    }

    return {
      path,
      label,
      kind: 'multiSelect',
      group: 'Choices',
      options,
    };
  }

  const kind = kindForScalar(property);

  if (!kind || !FIELD_PATH.test(path)) {
    return undefined;
  }

  const options =
    kind === 'select'
      ? (property.enum ?? []).filter(isSafeOption).map((value) => ({
          value,
          label: optionLabel(value),
        }))
      : undefined;

  if (kind === 'select' && (!options || options.length === 0)) {
    return undefined;
  }

  return { path, label, kind, group: groupFor(kind), options };
};

const schemaRef = (pathItem: { get?: { responses?: Record<string, unknown> } } | undefined) => {
  const response = pathItem?.get?.responses?.['200'] as
    | {
        content?: {
          'application/json'?: {
            schema?: {
              properties?: {
                data?: {
                  properties?: Record<string, { items?: { $ref?: string } }>;
                };
              };
            };
          };
        };
      }
    | undefined;
  const properties = response?.content?.['application/json']?.schema?.properties?.data
    ?.properties;
  const ref = properties
    ? Object.values(properties).find((entry) => entry.items?.$ref)?.items?.$ref
    : undefined;

  return ref?.replace('#/components/schemas/', '');
};

const fieldsForSchema = (
  properties: Record<string, SchemaProperty> | undefined,
): CatalogField[] => {
  const fields: CatalogField[] = [];

  for (const [name, property] of Object.entries(properties ?? {})) {
    if (SKIPPED_FIELDS.has(name) || property.items?.$ref) {
      continue;
    }

    if (property.type === 'object' && property.properties) {
      if ('amountMicros' in property.properties) {
        continue;
      }

      const parent = readable(property.description, name);

      for (const [childName, child] of Object.entries(property.properties)) {
        if (child.type === 'array' || child.type === 'object' || child.properties) {
          continue;
        }

        const field = fieldFromProperty(
          `${name}.${childName}`,
          `${parent} · ${childLabel(name, childName, child.description)}`,
          child,
        );

        if (field) {
          fields.push(field);
        }
      }

      continue;
    }

    const field = fieldFromProperty(name, readable(property.description, name), property);

    if (field) {
      fields.push(field);
    }
  }

  const groupOrder = { Dates: 0, Choices: 1, Other: 2 };

  return fields.sort(
    (left, right) =>
      groupOrder[left.group] - groupOrder[right.group] ||
      left.label.localeCompare(right.label),
  );
};

export const parseCatalog = (document: OpenApiDocument): CatalogObject[] => {
  const schemas = document.components?.schemas ?? {};
  const objects: CatalogObject[] = [];

  for (const tag of document.tags ?? []) {
    const namePlural = tag.name ?? '';

    if (
      !OBJECT_NAME.test(namePlural) ||
      HIDDEN_OBJECTS.has(namePlural) ||
      namePlural === 'General'
    ) {
      continue;
    }

    const schemaName = schemaRef(document.paths?.[`/${namePlural}`]);
    const fields = fieldsForSchema(schemaName ? schemas[schemaName]?.properties : undefined);

    if (fields.length === 0) {
      continue;
    }

    objects.push({
      namePlural,
      label: objectLabel(tag.description, namePlural),
      fields,
    });
  }

  return objects.sort((left, right) => left.label.localeCompare(right.label));
};

export const operatorsFor = (kind: FieldKind): OperatorChoice[] => {
  switch (kind) {
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
    case 'dateTime':
      return DATE_OPERATORS;
    case 'select':
      return SELECT_OPERATORS;
    case 'multiSelect':
      return MULTI_SELECT_OPERATORS;
    case 'boolean':
      return BOOLEAN_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
};

export const isDateKind = (kind: FieldKind | undefined): boolean =>
  kind === 'date' || kind === 'dateTime';

export const formatCalendarDate = (value: string): string => {
  const match = CALENDAR_DATE.exec(value);

  if (!match) {
    return value;
  }

  const month = MONTHS[Number(match[2]) - 1];

  if (!month) {
    return value;
  }

  return `${Number(match[3])} ${month} ${match[1]}`;
};

const quote = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed || !SAFE_TEXT.test(trimmed)) {
    throw new Error(
      'Use letters, numbers, spaces, or pick a value from the list.',
    );
  }

  return `"${trimmed}"`;
};

const localDayBounds = (date: string): { start: string; end: string } => {
  const match = CALENDAR_DATE.exec(date);

  if (!match) {
    throw new Error('Choose a date.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

  if (Number.isNaN(start.getTime()) || start.getDate() !== day) {
    throw new Error('Choose a valid date.');
  }

  return { start: start.toISOString(), end: end.toISOString() };
};

const dateClauses = (
  path: string,
  operator: string,
  value: string,
  kind: 'date' | 'dateTime',
): string[] => {
  if (!CALENDAR_DATE.test(value)) {
    throw new Error('Choose a date.');
  }

  if (kind === 'date') {
    const quoted = quote(value);

    switch (operator) {
      case 'on':
        return [`${path}[eq]:${quoted}`];
      case 'before':
        return [`${path}[lt]:${quoted}`];
      case 'after':
        return [`${path}[gt]:${quoted}`];
      case 'onOrBefore':
        return [`${path}[lte]:${quoted}`];
      case 'onOrAfter':
        return [`${path}[gte]:${quoted}`];
      default:
        throw new Error('Choose a date condition.');
    }
  }

  const bounds = localDayBounds(value);
  const start = quote(bounds.start);
  const end = quote(bounds.end);

  switch (operator) {
    case 'on':
      return [`${path}[gte]:${start}`, `${path}[lt]:${end}`];
    case 'before':
      return [`${path}[lt]:${start}`];
    case 'after':
      return [`${path}[gte]:${end}`];
    case 'onOrBefore':
      return [`${path}[lt]:${end}`];
    case 'onOrAfter':
      return [`${path}[gte]:${start}`];
    default:
      throw new Error('Choose a date condition.');
  }
};

const clausesForRow = (field: CatalogField, row: FilterDraft): string[] => {
  const operator = operatorsFor(field.kind).find((choice) => choice.id === row.operator);

  if (!operator) {
    throw new Error(`Choose a condition for ${field.label}.`);
  }

  if (operator.id === 'empty') {
    return [`${field.path}[is]:NULL`];
  }

  if (operator.id === 'notEmpty') {
    return [`${field.path}[is]:NOT_NULL`];
  }

  if (!operator.needsValue || row.value.trim().length === 0) {
    throw new Error(`Enter a value for ${field.label}.`);
  }

  if (field.kind === 'date' || field.kind === 'dateTime') {
    return dateClauses(field.path, operator.id, row.value.trim(), field.kind);
  }

  if (field.kind === 'number') {
    if (!NUMBER_VALUE.test(row.value.trim())) {
      throw new Error(`${field.label} needs a number.`);
    }

    return [`${field.path}[${operator.id}]:${row.value.trim()}`];
  }

  if (field.kind === 'boolean') {
    if (row.value !== 'true' && row.value !== 'false') {
      throw new Error(`Choose Yes or No for ${field.label}.`);
    }

    return [`${field.path}[eq]:${row.value}`];
  }

  if (field.kind === 'multiSelect') {
    return [`${field.path}[containsAny]:[${quote(row.value)}]`];
  }

  if (operator.id === 'contains') {
    const quoted = quote(row.value);

    return [`${field.path}[ilike]:"%${quoted.slice(1, -1)}%"`];
  }

  if (operator.id === 'startsWith') {
    return [`${field.path}[startsWith]:${quote(row.value)}`];
  }

  return [`${field.path}[${operator.id}]:${quote(row.value)}`];
};

export const buildExportFilter = (
  fields: CatalogField[],
  rows: FilterDraft[],
): string => {
  const active = rows.filter((row) => row.fieldPath.trim().length > 0);
  const clauses = active.flatMap((row) => {
    const field = fields.find((candidate) => candidate.path === row.fieldPath);

    if (!field) {
      throw new Error('Choose a field from the list.');
    }

    return clausesForRow(field, row);
  });

  if (clauses.length === 0) {
    return '';
  }

  const filter = clauses.length === 1 ? clauses[0] : `and(${clauses.join(',')})`;

  return assertRecordFilter(filter);
};

export const describeFilters = (
  objectLabelText: string,
  fields: CatalogField[],
  rows: FilterDraft[],
): string => {
  const parts = rows.flatMap((row) => {
    if (!row.fieldPath) {
      return [];
    }

    const field = fields.find((candidate) => candidate.path === row.fieldPath);
    const operator = field
      ? operatorsFor(field.kind).find((choice) => choice.id === row.operator)
      : undefined;

    if (!field || !operator) {
      return [];
    }

    if (!operator.needsValue) {
      return [`${field.label} ${operator.label.toLowerCase()}`];
    }

    if (!row.value) {
      return [];
    }

    const value =
      field.kind === 'date' || field.kind === 'dateTime'
        ? formatCalendarDate(row.value)
        : field.kind === 'boolean'
          ? row.value === 'true'
            ? 'Yes'
            : 'No'
          : (field.options?.find((option) => option.value === row.value)?.label ??
            row.value);

    return [`${field.label} ${operator.label.toLowerCase()} ${value}`];
  });

  if (parts.length === 0) {
    return `${objectLabelText}, every record`;
  }

  return `${objectLabelText} where ${parts.join(', and ')}`;
};
