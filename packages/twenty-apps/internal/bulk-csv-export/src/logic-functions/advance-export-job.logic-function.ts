import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { EXPORT_CHUNK_ROUTE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  advanceExportJob,
  runExportStep,
} from 'src/logic-functions/utils/export-service';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const handler = async (event: RoutePayload): Promise<Response> => {
  const body = (event.body ?? {}) as { jobId?: string };
  const jobId = body.jobId?.trim() ?? '';

  if (!jobId) {
    return json(
      {
        success: false,
        status: 'FAILED',
        exportedCount: 0,
        totalCount: 0,
        message: 'Export job id is required.',
      },
      400,
    );
  }

  const result = await runExportStep(() => advanceExportJob(jobId), jobId);

  return json(result, result.success ? 200 : 400);
};

export default defineLogicFunction({
  universalIdentifier: EXPORT_CHUNK_ROUTE_UNIVERSAL_IDENTIFIER,
  name: 'advance-bulk-csv-export',
  description:
    'Reads the next page of 200 records, stores that CSV page, and builds the file when the last page is done.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: '/bulk-csv-export/chunk',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
