import { type CSSProperties, type SyntheticEvent, useState } from 'react';
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
  assertObjectNamePlural,
  assertRecordFilter,
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

const BulkCsvExport = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const [objectNamePlural, setObjectNamePlural] = useState('');
  const [recordFilter, setRecordFilter] = useState('');
  const [selectedOnly, setSelectedOnly] = useState(selectedRecordIds.length > 0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('Ready to export.');
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>();

  const handleClose = () => {
    unmountFrontComponent();
    closeSidePanel();
  };

  const handleExport = async () => {
    setRunning(true);
    setDownloadUrl(undefined);

    try {
      const objectName = assertObjectNamePlural(objectNamePlural);
      const filter = selectedOnly
        ? buildSelectedIdFilter(selectedRecordIds)
        : assertRecordFilter(recordFilter);

      setProgress('Creating the export…');

      let state = await callAppRoute<ExportResponse>(
        '/bulk-csv-export/jobs',
        {
          objectNamePlural: objectName,
          recordFilter: filter,
        },
      );

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
        state.message ??
          `Exported ${state.exportedCount} of ${state.totalCount}.`,
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
          Pages through the object 200 records at a time and builds one CSV.
          The built-in Export view is unchanged.
        </p>
      </div>
      <div style={styles.body}>
        <label htmlFor="bulk-export-object" style={styles.label}>
          Object
        </label>
        <input
          id="bulk-export-object"
          value={objectNamePlural}
          placeholder="people, companies, leads"
          style={styles.input}
          disabled={running}
          onChange={(event) => setObjectNamePlural(readValue(event))}
        />
        <span style={styles.helper}>
          REST plural name of the object to export.
        </span>
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
        {!selectedOnly && (
          <>
            <label htmlFor="bulk-export-filter" style={styles.label}>
              Filter
            </label>
            <input
              id="bulk-export-filter"
              value={recordFilter}
              placeholder={'Optional, for example name.firstName[ilike]:"ada"'}
              style={styles.input}
              disabled={running}
              onChange={(event) => setRecordFilter(readValue(event))}
            />
          </>
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
            ...(running || objectNamePlural.trim().length === 0
              ? styles.primaryDisabled
              : {}),
          }}
          onClick={handleExport}
          disabled={running || objectNamePlural.trim().length === 0}
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
  helper: { color: 'var(--t-font-color-tertiary)', fontSize: 'var(--t-font-size-xs)' },
  input: {
    border: '1px solid var(--t-border-color-medium)',
    borderRadius: 'var(--t-border-radius-sm)',
    background: 'var(--t-background-primary)',
    color: 'var(--t-font-color-primary)',
    fontFamily: 'var(--t-font-family)',
    fontSize: 'var(--t-font-size-sm)',
    padding: 'var(--t-spacing-2)',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--t-spacing-2)',
  },
  progress: { margin: 0, color: 'var(--t-font-color-secondary)' },
  link: { color: 'var(--t-color-blue)' },
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
    'Starts a paged CSV export for an object or the currently selected records.',
  component: BulkCsvExport,
});
