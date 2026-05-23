import type { BulkSession, ImageJob } from './session';

export function collectJobObjectUrls(job: ImageJob): string[] {
  return [job.previewUrl, job.thumbnailUrl, job.output?.downloadUrl].filter(
    (url): url is string => Boolean(url),
  );
}

export function revokeJobObjectUrls(
  job: ImageJob,
  revokeObjectUrl = URL.revokeObjectURL,
): void {
  for (const url of collectJobObjectUrls(job)) revokeObjectUrl(url);
}

export function revokeSessionObjectUrls(
  session: BulkSession,
  revokeObjectUrl = URL.revokeObjectURL,
): void {
  for (const job of session.jobs) revokeJobObjectUrls(job, revokeObjectUrl);
}
