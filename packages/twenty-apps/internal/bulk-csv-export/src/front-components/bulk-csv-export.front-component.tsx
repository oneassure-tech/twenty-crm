import {
  type CSSProperties,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  unmountFrontComponent,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';

import {
  BULK_CSV_EXPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  EXPORT_MAX_PAGES,
  EXPORT_STATUS_READY,
} from 'src/constants/universal-identifiers';
import {
  buildExportFilter,
  describeFilters,
  isDateKind,
  operatorsFor,
  parseCatalog,
  type CatalogObject,
  type FilterDraft,
} from 'src/front-components/export-form';
import {
  assertObjectNamePlural,
  buildSelectedIdFilter,
} from 'src/logic-functions/utils/csv';

type ExportResponse = {
  success: boolean;
  jobId?: string;
  status: string;
  exportedCount: number;
  totalCount: number;
  fileUrl?: string;
  message?: string;
};

type FilterRow = FilterDraft & { id: number };

const MAX_FILTERS = 8;
const FIELD_GROUPS = ['Dates', 'Choices', 'Other'] as const;

const readValue = (event: SyntheticEvent<HTMLElement>): string => {
  const object = event as {
    detail?: { value?: string };
    target?: { value?: string };
  };

  return object.detail?.value ?? object.target?.value ?? '';
};

const callAppRoute = async <TResponse,>(
  path: string,
  body: Record<string, unknown>,
): Promise<TResponse> => {
  const apiBaseUrl = process.env.TWENTY_API_URL;
  const token =
    process.env.TWENTY_APP_ACCESS_TOKEN ?? process.env.TWENTY_API_KEY;

  if (!apiBaseUrl || !token) {
    throw new Error('App is missing API URL or access token configuration.');
  }

  const response = await fetch(`${apiBaseUrl}/s${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | (TResponse & { message?: string })
    | null;

  if (!response.ok) {
    throw new Error(
      payload?.message ?? `Request failed with status ${response.status}.`,
    );
  }

  if (!payload) {
    throw new Error('Export returned an empty response.');
  }

  return payload;
};

const fileHref = (fileUrl: string): string => {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  const apiBaseUrl = process.env.TWENTY_API_URL ?? '';

  return `${apiBaseUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
};

const loadCatalog = async (): Promise<CatalogObject[]> => {
  const apiBaseUrl = process.env.TWENTY_API_URL;
  const token = process.env.TWENTY_APP_ACCESS_TOKEN ?? process.env.TWENTY_API_KEY;

  if (!apiBaseUrl || !token) {
    throw new Error('App is missing API URL or access token configuration.');
  }

  const response = await fetch(`${apiBaseUrl}/rest/open-api/core`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Could not load the list of objects.');
  }

  const objects = parseCatalog((await response.json()) as never);

  if (objects.length === 0) {
    throw new Error('No objects are available to export.');
  }

  return objects;
};

const BulkCsvExport = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const nextFilterId = useRef(1);
  const [objects, setObjects] = useState<CatalogObject[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [objectNamePlural, setObjectNamePlural] = useState('');
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: 1, fieldPath: '', operator: '', value: '' },
  ]);
  const [selectedOnly, setSelectedOnly] = useState(selectedRecordIds.length > 0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('Ready to export.');
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    loadCatalog()
      .then((nextObjects) => {
        if (!cancelled) {
          setObjects(nextObjects);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error ? error.message : 'Could not load the list of objects.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentObject = objects.find((object) => object.namePlural === objectNamePlural);
  const filtersLocked = selectedOnly || running;
  const summary =
    currentObject && !selectedOnly
      ? describeFilters(currentObject.label, currentObject.fields, filters)
      : '';
  const filtersIncomplete =
    !selectedOnly &&
    filters.some((row) => {
      if (!row.fieldPath || !currentObject) {
        return Boolean(row.fieldPath);
      }

      const field = currentObject.fields.find((candidate) => candidate.path === row.fieldPath);
      const operator = field
        ? operatorsFor(field.kind).find((choice) => choice.id === row.operator)
        : undefined;

      if (!field || !operator) {
        return true;
      }

      return operator.needsValue && row.value.trim().length === 0;
    });

  const handleClose = () => {
    unmountFrontComponent();
    closeSidePanel();
  };

  const updateFilter = (id: number, patch: Partial<FilterDraft>) => {
    setFilters((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const handleFieldChange = (id: number, fieldPath: string) => {
    const field = currentObject?.fields.find((candidate) => candidate.path === fieldPath);
    const operator = field ? (operatorsFor(field.kind)[0]?.id ?? '') : '';

    updateFilter(id, { fieldPath, operator, value: '' });
  };

  const addFilter = () => {
    if (filters.length >= MAX_FILTERS) {
      return;
    }

    nextFilterId.current += 1;
    setFilters((current) => [
      ...current,
      { id: nextFilterId.current, fieldPath: '', operator: '', value: '' },
    ]);
  };

  const removeFilter = (id: number) => {
    setFilters((current) => {
      const next = current.filter((row) => row.id !== id);

      return next.length > 0
        ? next
        : [{ id, fieldPath: '', operator: '', value: '' }];
    });
  };

  const handleExport = async () => {
    setRunning(true);
    setDownloadUrl(undefined);

    try {
      const objectName = assertObjectNamePlural(objectNamePlural);
      const filter = selectedOnly
        ? buildSelectedIdFilter(selectedRecordIds)
        : buildExportFilter(currentObject?.fields ?? [], filters);

      setProgress('Creating the export…');

      let state = await callAppRoute<ExportResponse>('/bulk-csv-export/jobs', {
        objectNamePlural: objectName,
        recordFilter: filter,
      });

      if (!state.success || !state.jobId) {
        throw new Error(state.message ?? 'Could not create the export.');
      }

      for (let page = 0; page < EXPORT_MAX_PAGES; page += 1) {
        if (state.status === EXPORT_STATUS_READY) {
          break;
        }

        setProgress(
          state.totalCount > 0
            ? `Exported ${state.exportedCount} of ${state.totalCount}…`
            : `Exported ${state.exportedCount} records…`,
        );

        state = await callAppRoute<ExportResponse>('/bulk-csv-export/chunk', {
          jobId: state.jobId,
        });

        if (!state.success || state.status === 'FAILED') {
          throw new Error(state.message ?? 'Export failed.');
        }
      }

      if (state.status !== EXPORT_STATUS_READY) {
        throw new Error(state.message ?? 'Export did not finish.');
      }

      setProgress(
        state.message ?? `Exported ${state.exportedCount} of ${state.totalCount}.`,
      );

      if (state.fileUrl) {
        setDownloadUrl(fileHref(state.fileUrl));
      }

      await enqueueSnackbar({
        message: 'CSV is ready. Download it here or from Bulk exports.',
        variant: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';

      setProgress(message);
      await enqueueSnackbar({ message, variant: 'error' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Bulk CSV export</h2>
        <p style={styles.subtitle}>
          Choose an object, then optionally filter it. Leave the filters empty
          to download every record.
        </p>
      </div>
      <div style={styles.body}>
        <label htmlFor="bulk-export-object" style={styles.label}>
          Object
        </label>
        <select
          id="bulk-export-object"
          value={objectNamePlural}
          style={styles.control}
          disabled={running || catalogLoading || Boolean(catalogError)}
          onChange={(event) => {
            setObjectNamePlural(readValue(event));
            setFilters([{ id: 1, fieldPath: '', operator: '', value: '' }]);
            nextFilterId.current = 1;
            setDownloadUrl(undefined);
            setProgress('Ready to export.');
          }}
        >
          <option value="">
            {catalogLoading ? 'Loading objects…' : 'Choose an object'}
          </option>
          {objects.map((object) => (
            <option key={object.namePlural} value={object.namePlural}>
              {object.label}
            </option>
          ))}
        </select>
        {catalogError && <span style={styles.error}>{catalogError}</span>}
        {selectedRecordIds.length > 0 && (
          <label style={styles.checkLabel}>
            <input
              type="checkbox"
              checked={selectedOnly}
              disabled={running}
              onChange={() => setSelectedOnly((current) => !current)}
            />
            Export {selectedRecordIds.length} selected record
            {selectedRecordIds.length === 1 ? '' : 's'} only
          </label>
        )}
        {currentObject && !selectedOnly && (
          <div style={styles.filters}>
            <span style={styles.label}>Filters</span>
            <span style={styles.helper}>
              Pick a field, a condition, and a value. The date picker appears
              only for date fields.
            </span>
            {filters.map((row, index) => {
              const field = currentObject.fields.find(
                (candidate) => candidate.path === row.fieldPath,
              );
              const operators = field ? operatorsFor(field.kind) : [];
              const operator = operators.find((choice) => choice.id === row.operator);
              const showValue = Boolean(field && operator?.needsValue);
              const datePicker = showValue && isDateKind(field?.kind);

              return (
                <div key={row.id} style={styles.filterCard}>
                  <label htmlFor={`bulk-export-field-${row.id}`} style={styles.miniLabel}>
                    Field {filters.length > 1 ? index + 1 : ''}
                  </label>
                  <select
                    id={`bulk-export-field-${row.id}`}
                    value={row.fieldPath}
                    style={styles.control}
                    disabled={filtersLocked}
                    onChange={(event) => handleFieldChange(row.id, readValue(event))}
                  >
                    <option value="">Choose a field</option>
                    {FIELD_GROUPS.map((group) => {
                      const groupFields = currentObject.fields.filter(
                        (candidate) => candidate.group === group,
                      );

                      if (groupFields.length === 0) {
                        return null;
                      }

                      return (
                        <optgroup key={group} label={group}>
                          {groupFields.map((candidate) => (
                            <option key={candidate.path} value={candidate.path}>
                              {candidate.label}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  <label htmlFor={`bulk-export-operator-${row.id}`} style={styles.miniLabel}>
                    Condition
                  </label>
                  <select
                    id={`bulk-export-operator-${row.id}`}
                    value={row.operator}
                    style={styles.control}
                    disabled={filtersLocked || !field}
                    onChange={(event) =>
                      updateFilter(row.id, { operator: readValue(event), value: '' })
                    }
                  >
                    <option value="">{field ? 'Choose a condition' : 'Choose a field first'}</option>
                    {operators.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                  {showValue && (
                    <>
                      <label htmlFor={`bulk-export-value-${row.id}`} style={styles.miniLabel}>
                        Value
                      </label>
                      {datePicker && (
                        <input
                          id={`bulk-export-value-${row.id}`}
                          type="date"
                          value={row.value}
                          style={styles.control}
                          disabled={filtersLocked}
                          onChange={(event) =>
                            updateFilter(row.id, { value: readValue(event) })
                          }
                        />
                      )}
                      {field?.kind === 'select' || field?.kind === 'multiSelect' ? (
                        <select
                          id={`bulk-export-value-${row.id}`}
                          value={row.value}
                          style={styles.control}
                          disabled={filtersLocked}
                          onChange={(event) =>
                            updateFilter(row.id, { value: readValue(event) })
                          }
                        >
                          <option value="">Choose a value</option>
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {field?.kind === 'boolean' && (
                        <select
                          id={`bulk-export-value-${row.id}`}
                          value={row.value}
                          style={styles.control}
                          disabled={filtersLocked}
                          onChange={(event) =>
                            updateFilter(row.id, { value: readValue(event) })
                          }
                        >
                          <option value="">Choose a value</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      )}
                      {field?.kind === 'number' && (
                        <input
                          id={`bulk-export-value-${row.id}`}
                          type="number"
                          value={row.value}
                          placeholder="Enter a number"
                          style={styles.control}
                          disabled={filtersLocked}
                          onChange={(event) =>
                            updateFilter(row.id, { value: readValue(event) })
                          }
                        />
                      )}
                      {field?.kind === 'text' && (
                        <input
                          id={`bulk-export-value-${row.id}`}
                          type="text"
                          value={row.value}
                          placeholder="Enter text"
                          style={styles.control}
                          disabled={filtersLocked}
                          onChange={(event) =>
                            updateFilter(row.id, { value: readValue(event) })
                          }
                        />
                      )}
                    </>
                  )}
                  {filters.length > 1 && (
                    <button
                      type="button"
                      style={styles.textButton}
                      disabled={filtersLocked}
                      onClick={() => removeFilter(row.id)}
                    >
                      Remove filter
                    </button>
                  )}
                </div>
              );
            })}
            {filters.length < MAX_FILTERS && (
              <button
                type="button"
                style={styles.textButton}
                disabled={filtersLocked}
                onClick={addFilter}
              >
                Add another filter
              </button>
            )}
            {summary && <p style={styles.summary}>{summary}</p>}
          </div>
        )}
        {selectedOnly && (
          <p style={styles.helper}>
            The selected rows are exported as they are. Turn this off to filter
            the whole object, including by date.
          </p>
        )}
        <p style={styles.progress}>{progress}</p>
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer" style={styles.link}>
            Download CSV
          </a>
        )}
      </div>
      <div style={styles.footer}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.secondary }}
          onClick={handleClose}
          disabled={running}
        >
          Close
        </button>
        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.primary,
            ...(running ||
            catalogLoading ||
            !objectNamePlural ||
            filtersIncomplete
              ? styles.primaryDisabled
              : {}),
          }}
          onClick={handleExport}
          disabled={running || catalogLoading || !objectNamePlural || filtersIncomplete}
        >
          {running ? 'Exporting…' : 'Start export'}
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--t-spacing-4)',
    padding: 'var(--t-spacing-4)',
    background: 'var(--t-background-primary)',
    color: 'var(--t-font-color-primary)',
    fontFamily: 'var(--t-font-family)',
    fontSize: 'var(--t-font-size-sm)',
  },
  header: { display: 'flex', flexDirection: 'column', gap: 'var(--t-spacing-2)' },
  title: {
    margin: 0,
    fontSize: 'var(--t-font-size-md)',
    fontWeight: 'var(--t-font-weight-semi-bold)',
  },
  subtitle: { margin: 0, color: 'var(--t-font-color-secondary)' },
  body: { display: 'flex', flexDirection: 'column', gap: 'var(--t-spacing-2)' },
  label: { fontWeight: 'var(--t-font-weight-medium)' },
  miniLabel: {
    color: 'var(--t-font-color-secondary)',
    fontSize: 'var(--t-font-size-xs)',
  },
  helper: { color: 'var(--t-font-color-tertiary)', fontSize: 'var(--t-font-size-xs)' },
  error: { color: 'var(--t-font-color-danger)' },
  control: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid var(--t-border-color-medium)',
    borderRadius: 'var(--t-border-radius-sm)',
    background: 'var(--t-background-primary)',
    color: 'var(--t-font-color-primary)',
    fontFamily: 'var(--t-font-family)',
    fontSize: 'var(--t-font-size-sm)',
    padding: 'var(--t-spacing-2)',
  },
  filters: { display: 'flex', flexDirection: 'column', gap: 'var(--t-spacing-2)' },
  filterCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--t-spacing-1)',
    padding: 'var(--t-spacing-2)',
    border: '1px solid var(--t-border-color-light)',
    borderRadius: 'var(--t-border-radius-sm)',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--t-spacing-2)',
  },
  summary: { margin: 0, color: 'var(--t-font-color-secondary)' },
  progress: { margin: 0, color: 'var(--t-font-color-secondary)' },
  link: { color: 'var(--t-color-blue)' },
  textButton: {
    alignSelf: 'flex-start',
    border: 'none',
    background: 'transparent',
    color: 'var(--t-font-color-secondary)',
    fontFamily: 'var(--t-font-family)',
    fontSize: 'var(--t-font-size-sm)',
    padding: 0,
    cursor: 'pointer',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 'var(--t-spacing-2)' },
  button: {
    border: '1px solid var(--t-border-color-medium)',
    borderRadius: 'var(--t-border-radius-sm)',
    fontFamily: 'var(--t-font-family)',
    fontSize: 'var(--t-font-size-sm)',
    padding: 'var(--t-spacing-2) var(--t-spacing-3)',
    cursor: 'pointer',
  },
  secondary: {
    background: 'var(--t-background-secondary)',
    color: 'var(--t-font-color-primary)',
  },
  primary: {
    background: 'var(--t-accent-accent4060)',
    color: 'var(--t-font-color-inverted)',
    border: 'none',
  },
  primaryDisabled: { opacity: 0.6, cursor: 'default' },
};

export default defineFrontComponent({
  universalIdentifier: BULK_CSV_EXPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'bulk-csv-export',
  description:
    'Starts a paged CSV export for an object, with field, condition, and date filters.',
  component: BulkCsvExport,
});
