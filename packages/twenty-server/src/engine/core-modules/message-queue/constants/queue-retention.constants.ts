export const QUEUE_RETENTION = {
  // Completed jobs use removeOnComplete: true in bullmq.driver (not retained).
  // These zeros are exposed via admin retentionConfig for clarity.
  completedMaxAge: 0,
  completedMaxCount: 0,
  failedMaxAge: 86400, // 1 day
  failedMaxCount: 50,
};
