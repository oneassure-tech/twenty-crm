import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { CREATE_EXPORT_JOB_ROUTE_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  createExportJob,
  runExportStep,
} from 'src/logic-functions/utils/export-service';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const handler = async (event: RoutePayload): Promise<Response> => {
  const body = (event.body ?? {}) as {
    objectNamePlural?: string;
    recordFilter?: string;
  };

  const result = await runExportStep(() =>
    createExportJob({
      objectNamePlural: body.objectNamePlural ?? '',
      recordFilter: body.recordFilter,
    }),
  );

  return json(result, result.success ? 200 : 400);
};

export default defineLogicFunction({
  universalIdentifier: CREATE_EXPORT_JOB_ROUTE_UNIVERSAL_IDENTIFIER,
  name: 'create-bulk-csv-export',
  description: 'Creates a bulk CSV export job for one object.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/bulk-csv-export/jobs',
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
