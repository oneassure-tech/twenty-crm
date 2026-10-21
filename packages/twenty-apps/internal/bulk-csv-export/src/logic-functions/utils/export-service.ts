import { MetadataApiClient } from 'twenty-client-sdk/metadata';

import {
  EXPORT_JOB_FILE_FIELD_UNIVERSAL_IDENTIFIER,
  EXPORT_MAX_PAGES,
  EXPORT_PAGE_SIZE,
  EXPORT_STATUS_ASSEMBLING,
  EXPORT_STATUS_FAILED,
  EXPORT_STATUS_QUEUED,
  EXPORT_STATUS_READY,
  EXPORT_STATUS_RUNNING,
} from 'src/constants/universal-identifiers';
import {
  assertObjectNamePlural,
  assertRecordFilter,
  flattenRecord,
  mergeColumns,
  readColumns,
  toCsv,
} from 'src/logic-functions/utils/csv';
import {
  errorMessage,
  restCreate,
  restGetOne,
  restList,
  restPatch,
} from 'src/logic-functions/utils/twenty-rest';

export type ExportProgress = {
  success: boolean;
  jobId?: string;
  status: string;
  exportedCount: number;
  totalCount: number;
  fileUrl?: string;
  message?: string;
};

type ExportJobRecord = {
  id: string;
  name?: string | null;
  status?: string | null;
  objectNamePlural?: string | null;
  recordFilter?: string | null;
  cursor?: string | null;
  exportedCount?: number | null;
  totalCount?: number | null;
  pageIndex?: number | null;
  columns?: string | null;
  pagesComplete?: boolean | null;
  errorMessage?: string | null;
  fileUrl?: string | null;
};

type ExportChunkRecord = {
  id: string;
  position?: number | null;
  csv?: string | null;
};

const asNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const progressFromJob = (
  job: ExportJobRecord,
  extra?: Partial<ExportProgress>,
): ExportProgress => ({
  success: job.status === EXPORT_STATUS_READY,
  jobId: job.id,
  status: asString(job.status),
  exportedCount: asNumber(job.exportedCount),
  totalCount: asNumber(job.totalCount),
  fileUrl: asString(job.fileUrl) || undefined,
  message: asString(job.errorMessage) || undefined,
  ...extra,
});

const markFailed = async (
  jobId: string,
  message: string,
): Promise<ExportProgress> => {
  try {
    const job = await restPatch<ExportJobRecord>(
      `/rest/exportJobs/${jobId}`,
      'updateExportJob',
      {
        status: EXPORT_STATUS_FAILED,
        errorMessage: message.slice(0, 4000),
      },
    );

    return progressFromJob(job, {
      success: false,
      status: EXPORT_STATUS_FAILED,
      message,
    });
  } catch {
    return {
      success: false,
      jobId,
      status: EXPORT_STATUS_FAILED,
      exportedCount: 0,
      totalCount: 0,
      message,
    };
  }
};

export const createExportJob = async (input: {
  objectNamePlural: string;
  recordFilter?: string;
}): Promise<ExportProgress> => {
  const objectNamePlural = assertObjectNamePlural(input.objectNamePlural);
  const recordFilter = assertRecordFilter(input.recordFilter);
  const name = `${objectNamePlural} export ${new Date().toISOString()}`;

  const job = await restCreate<ExportJobRecord>(
    '/rest/exportJobs',
    'createExportJob',
    {
      name,
      status: EXPORT_STATUS_QUEUED,
      objectNamePlural,
      recordFilter,
      exportedCount: 0,
      totalCount: 0,
      pageIndex: 0,
      pagesComplete: false,
    },
  );

  return progressFromJob(job, { success: true, status: EXPORT_STATUS_QUEUED });
};

const findChunk = async (
  jobId: string,
  position: number,
): Promise<ExportChunkRecord | undefined> => {
  const page = await restList<ExportChunkRecord>(
    '/rest/exportChunks',
    'exportChunks',
    {
      depth: 0,
      limit: 1,
      filter: `and(jobId[eq]:${jobId},position[eq]:${position})`,
    },
  );

  return page.records[0];
};

const loadChunkCsv = async (jobId: string): Promise<string> => {
  const parts: { position: number; csv: string }[] = [];
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < EXPORT_MAX_PAGES; pageNumber += 1) {
    const page = await restList<ExportChunkRecord>(
      '/rest/exportChunks',
      'exportChunks',
      {
        depth: 0,
        limit: 50,
        order_by: 'position[AscNullsFirst]',
        filter: `jobId[eq]:${jobId}`,
        ...(cursor ? { starting_after: cursor } : {}),
      },
    );

    for (const record of page.records) {
      parts.push({
        position: asNumber(record.position),
        csv: asString(record.csv),
      });
    }

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    cursor = page.pageInfo.endCursor;
  }

  parts.sort((left, right) => left.position - right.position);

  return parts.map((part) => part.csv).join('');
};

const uploadCsv = async (
  csv: string,
  fileName: string,
): Promise<{ id: string; url: string }> => {
  const body = Buffer.from(`\uFEFF${csv}`, 'utf8');
  const metadataClient = new MetadataApiClient();
  const { createFileUpload } = await metadataClient.mutation({
    createFileUpload: {
      __args: {
        filename: fileName,
        size: body.length,
        fileFolder: 'FilesField',
        fieldMetadataUniversalIdentifier:
          EXPORT_JOB_FILE_FIELD_UNIVERSAL_IDENTIFIER,
      },
      fileId: true,
      uploadUrl: true,
      contentType: true,
    },
  });

  if (!createFileUpload?.uploadUrl || !createFileUpload?.fileId) {
    throw new Error('File upload did not return an upload URL.');
  }

  const uploadResponse = await fetch(createFileUpload.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type':
        createFileUpload.contentType || 'application/octet-stream',
    },
    body,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `CSV upload failed with status ${uploadResponse.status}.`,
    );
  }

  const { completeFileUpload } = await metadataClient.mutation({
    completeFileUpload: {
      __args: { fileId: createFileUpload.fileId },
      id: true,
      url: true,
    },
  });

  if (!completeFileUpload?.id) {
    throw new Error('File upload did not finish.');
  }

  return {
    id: completeFileUpload.id,
    url: completeFileUpload.url ?? '',
  };
};

const assembleFile = async (job: ExportJobRecord): Promise<ExportProgress> => {
  await restPatch<ExportJobRecord>(
    `/rest/exportJobs/${job.id}`,
    'updateExportJob',
    { status: EXPORT_STATUS_ASSEMBLING, errorMessage: '' },
  );

  const csv = await loadChunkCsv(job.id);
  const fileName = `${asString(job.objectNamePlural) || 'export'}-${job.id}.csv`;
  const uploaded = await uploadCsv(csv, fileName);

  const updated = await restPatch<ExportJobRecord>(
    `/rest/exportJobs/${job.id}`,
    'updateExportJob',
    {
      status: EXPORT_STATUS_READY,
      fileUrl: uploaded.url,
      file: [{ fileId: uploaded.id, label: fileName }],
      errorMessage: '',
    },
  );

  return progressFromJob(updated, {
    success: true,
    status: EXPORT_STATUS_READY,
    fileUrl: uploaded.url,
    message:
      asNumber(updated.exportedCount) === 0
        ? 'No records matched this export.'
        : undefined,
  });
};

export const advanceExportJob = async (
  jobId: string,
): Promise<ExportProgress> => {
  const job = await restGetOne<ExportJobRecord>(
    `/rest/exportJobs/${jobId}`,
    'exportJob',
  );

  if (job.status === EXPORT_STATUS_READY) {
    return progressFromJob(job, { success: true });
  }

  if (job.pagesComplete) {
    return assembleFile(job);
  }

  const objectNamePlural = assertObjectNamePlural(
    asString(job.objectNamePlural),
  );
  const pageIndex = asNumber(job.pageIndex);

  if (pageIndex >= EXPORT_MAX_PAGES) {
    return markFailed(
      job.id,
      `Stopped after ${EXPORT_MAX_PAGES} pages. Narrow the filter and run the export again.`,
    );
  }

  const recordFilter = asString(job.recordFilter);
  const cursor = asString(job.cursor);
  const page = await restList<Record<string, unknown>>(
    `/rest/${objectNamePlural}`,
    objectNamePlural,
    {
      depth: 0,
      limit: EXPORT_PAGE_SIZE,
      order_by: 'id[AscNullsFirst]',
      ...(recordFilter ? { filter: recordFilter } : {}),
      ...(cursor ? { starting_after: cursor } : {}),
    },
  );

  const rows = page.records.map((record) => flattenRecord(record));
  const columns = mergeColumns(readColumns(job.columns), rows);
  const includeHeader = pageIndex === 0 && columns.length > 0;
  const csv = toCsv(rows, columns, includeHeader);
  const existingChunk = await findChunk(job.id, pageIndex);

  if (!existingChunk && csv.length > 0) {
    await restCreate(
      '/rest/exportChunks',
      'createExportChunk',
      {
        name: `${objectNamePlural} part ${pageIndex}`,
        jobId: job.id,
        position: pageIndex,
        csv,
      },
    );
  }

  const hasNextPage = Boolean(page.pageInfo.hasNextPage && page.pageInfo.endCursor);
  const exportedCount = asNumber(job.exportedCount) + rows.length;

  if (hasNextPage && rows.length === 0) {
    return markFailed(
      job.id,
      'The next page came back empty, so the export stopped instead of looping.',
    );
  }

  const updated = await restPatch<ExportJobRecord>(
    `/rest/exportJobs/${job.id}`,
    'updateExportJob',
    {
      status: hasNextPage ? EXPORT_STATUS_RUNNING : EXPORT_STATUS_ASSEMBLING,
      cursor: hasNextPage ? page.pageInfo.endCursor : cursor,
      exportedCount,
      totalCount: page.totalCount,
      pageIndex: pageIndex + 1,
      columns: JSON.stringify(columns),
      pagesComplete: !hasNextPage,
      errorMessage: '',
    },
  );

  if (!hasNextPage) {
    return assembleFile({ ...job, ...updated, objectNamePlural });
  }

  return progressFromJob(updated, {
    success: true,
    status: EXPORT_STATUS_RUNNING,
  });
};

export const runExportStep = async (
  action: () => Promise<ExportProgress>,
  jobId?: string,
): Promise<ExportProgress> => {
  try {
    return await action();
  } catch (error) {
    const message = errorMessage(error);

    if (jobId) {
      return markFailed(jobId, message);
    }

    return {
      success: false,
      status: EXPORT_STATUS_FAILED,
      exportedCount: 0,
      totalCount: 0,
      message,
    };
  }
};
