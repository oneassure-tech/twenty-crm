import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type WorkflowStep } from '@/workflow/types/Workflow';
import { useMemo } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

const ACTIVE_WORKFLOW_VERSIONS_FILTER = {
  status: { eq: 'ACTIVE' },
};

const ACTIVE_WORKFLOW_VERSIONS_LIMIT = 60;

const RECORD_GQL_FIELDS = {
  id: true,
  trigger: true,
  steps: true,
};

// e.g. "lead.updated" -> "lead"
const getTriggerObjectNameSingular = (
  trigger: unknown,
): string | undefined => {
  if (!isDefined(trigger) || typeof trigger !== 'object') {
    return undefined;
  }

  const settings = (trigger as { settings?: { eventName?: unknown } }).settings;
  const eventName = settings?.eventName;

  if (typeof eventName !== 'string') {
    return undefined;
  }

  const [objectNameSingular] = eventName.split('.');

  return isDefined(objectNameSingular) && objectNameSingular.length > 0
    ? objectNameSingular
    : undefined;
};

/**
 * Which objects, if any, currently have a published workflow that can ask for a
 * required field.
 *
 * Exists so the pending-input watcher stays completely inert in workspaces that
 * do not use this feature: with no such workflow it never queries runs and
 * never polls, and even when one exists it only reacts to writes on the objects
 * those workflows actually watch.
 */
export const useRequireFieldWatchedObjectNames = (): {
  watchedObjectNameSingulars: Set<string>;
} => {
  const { records: workflowVersions } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.WorkflowVersion,
    filter: ACTIVE_WORKFLOW_VERSIONS_FILTER,
    recordGqlFields: RECORD_GQL_FIELDS,
    limit: ACTIVE_WORKFLOW_VERSIONS_LIMIT,
  });

  const watchedObjectNameSingulars = useMemo(() => {
    const objectNameSingulars = new Set<string>();

    for (const workflowVersion of workflowVersions) {
      const steps = workflowVersion.steps as WorkflowStep[] | null | undefined;

      const hasRequireFieldStep =
        steps?.some((step) => step.type === 'REQUIRE_FIELD') ?? false;

      if (!hasRequireFieldStep) {
        continue;
      }

      const objectNameSingular = getTriggerObjectNameSingular(
        workflowVersion.trigger,
      );

      if (isDefined(objectNameSingular)) {
        objectNameSingulars.add(objectNameSingular);
      }
    }

    return objectNameSingulars;
  }, [workflowVersions]);

  return { watchedObjectNameSingulars };
};
