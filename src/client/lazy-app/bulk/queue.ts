import type {
  BulkSession,
  ImageJob,
  ImageJobStatus,
  ImageOutput,
} from './session';
import { getEffectiveSettings, settingsHash } from './settings';

export const defaultBulkConcurrency = 2;

export function getRunnableJobs(
  session: BulkSession,
  concurrency = defaultBulkConcurrency,
): ImageJob[] {
  const openSlots = Math.max(0, concurrency - session.activeJobs);
  if (openSlots === 0) return [];

  return session.jobs
    .filter((job) => job.status === 'queued')
    .slice(0, openSlots);
}

export function updateJob(
  session: BulkSession,
  jobId: string,
  update: (job: ImageJob) => ImageJob,
): BulkSession {
  return {
    ...session,
    jobs: session.jobs.map((job) => (job.id === jobId ? update(job) : job)),
  };
}

export function setJobStatus(
  session: BulkSession,
  jobId: string,
  status: ImageJobStatus,
): BulkSession {
  return updateJob(session, jobId, (job) => ({ ...job, status }));
}

export function startJob(session: BulkSession, jobId: string): BulkSession {
  return {
    ...setJobStatus(session, jobId, 'processing'),
    activeJobs: session.activeJobs + 1,
  };
}

export function completeJob(
  session: BulkSession,
  jobId: string,
  output: ImageOutput,
): BulkSession {
  return {
    ...updateJob(session, jobId, (job) => ({
      ...job,
      status: 'encoded',
      output,
      error: undefined,
    })),
    activeJobs: Math.max(0, session.activeJobs - 1),
  };
}

export function failJob(
  session: BulkSession,
  jobId: string,
  error: string,
): BulkSession {
  return {
    ...updateJob(session, jobId, (job) => ({
      ...job,
      status: 'failed',
      error,
    })),
    activeJobs: Math.max(0, session.activeJobs - 1),
  };
}

export function requeueJob(session: BulkSession, jobId: string): BulkSession {
  return updateJob(session, jobId, (job) => ({
    ...job,
    status: 'queued',
    output: undefined,
    error: undefined,
  }));
}

export function isJobOutputStale(session: BulkSession, job: ImageJob): boolean {
  if (!job.output) return true;
  const effectiveSettings = getEffectiveSettings(
    session.globalSettings,
    job.overrides,
  );
  return job.output.settingsHash !== settingsHash(effectiveSettings);
}

export function requeueStaleJobs(session: BulkSession): BulkSession {
  return {
    ...session,
    jobs: session.jobs.map((job) => {
      if (!job.output || !isJobOutputStale(session, job)) return job;
      return {
        ...job,
        status: 'queued',
        output: undefined,
        error: undefined,
      };
    }),
  };
}
