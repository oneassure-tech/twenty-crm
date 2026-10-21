import { EXPORT_MAX_SELECTED_IDS } from 'src/constants/universal-identifiers';

const OBJECT_NAME_PLURAL = /^[A-Za-z][A-Za-z0-9]*$/;
const RECORD_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RECORD_FILTER = /^[A-Za-z0-9_.,:[\]"'{}()\- ]+$/;

const SKIPPED_RECORD_KEYS = new Set(['searchVector']);

const RESERVED_OBJECT_NAMES = new Set(['exportJobs', 'exportChunks']);

export const assertObjectNamePlural = (value: string): string => {
  const trimmed = value.trim();

  if (!OBJECT_NAME_PLURAL.test(trimmed) || RESERVED_OBJECT_NAMES.has(trimmed)) {
    throw new Error(
      'Object name must be the REST plural name, such as people, companies, or leads.',
    );
  }

  return trimmed;
};

export const assertRecordFilter = (value: string | undefined): string => {
  const trimmed = value?.trim() ?? '';

  if (trimmed.length === 0) {
    return '';
  }

  if (trimmed.length > 8000 || !RECORD_FILTER.test(trimmed)) {
    throw new Error('Filter contains characters the export cannot send.');
  }

  return trimmed;
};

export const buildSelectedIdFilter = (ids: string[]): string => {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  if (unique.length === 0) {
    throw new Error('No records selected.');
  }

  if (unique.length > EXPORT_MAX_SELECTED_IDS) {
    throw new Error(
      `Select at most ${EXPORT_MAX_SELECTED_IDS} records, or clear the selection to export the whole object.`,
    );
  }

  if (unique.some((id) => !RECORD_ID.test(id))) {
    throw new Error('Selected record ids are not valid.');
  }

  if (unique.length === 1) {
    return `id[eq]:${unique[0]}`;
  }

  return `or(${unique.map((id) => `id[eq]:${id}`).join(',')})`;
};

export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
};

export const flattenRecord = (
  record: Record<string, unknown>,
): Record<string, string> => {
  const flat: Record<string, string> = {};

  for (const [key, value] of Object.entries(record)) {
    if (SKIPPED_RECORD_KEYS.has(key)) {
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        flat[`${key}.${subKey}`] = formatCell(subValue);
      }

      continue;
    }

    flat[key] = formatCell(value);
  }

  return flat;
};

export const columnOrder = (rows: Record<string, string>[]): string[] => {
  const keys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      keys.add(key);
    }
  }

  const rest = [...keys].filter((key) => key !== 'id').sort();

  return keys.has('id') ? ['id', ...rest] : rest;
};

export const mergeColumns = (
  existing: string[],
  rows: Record<string, string>[],
): string[] => {
  const discovered = columnOrder(rows);

  if (existing.length === 0) {
    return discovered;
  }

  const seen = new Set(existing);
  const next = [...existing];

  for (const key of discovered) {
    if (!seen.has(key)) {
      seen.add(key);
      next.push(key);
    }
  }

  return next;
};

export const escapeCsv = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

export const toCsv = (
  rows: Record<string, string>[],
  columns: string[],
  includeHeader: boolean,
): string => {
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.map(escapeCsv).join(','));
  }

  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsv(row[column] ?? '')).join(','));
  }

  if (lines.length === 0) {
    return '';
  }

  return `${lines.join('\n')}\n`;
};

export const readColumns = (value: unknown): string[] => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== 'string')
    ) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};
