export const QUEUE_RETENTION = {
  completedMaxAge: 1800, // 30 minutes — keep Redis small on shared 256Mi-class instances
  completedMaxCount: 75,
  failedMaxAge: 86400, // 1 day
  failedMaxCount: 50,
};
