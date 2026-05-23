import type { BulkSession, ImageJob } from './session';
import { isJobOutputStale } from './queue';

export interface BulkExportSummary {
  ready: number;
  failed: number;
  pending: number;
  skipped: number;
  totalOriginalSize: number;
  totalOutputSize: number;
  percentChange: number;
}

export interface BulkExportEntry {
  job: ImageJob;
  fileName: string;
  downloadUrl: string;
  size: number;
}

function splitFileName(fileName: string): {
  baseName: string;
  extension: string;
} {
  const normalizedName = fileName.trim() || 'image';
  const lastDot = normalizedName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === normalizedName.length - 1) {
    return {
      baseName: normalizedName,
      extension: '',
    };
  }
  return {
    baseName: normalizedName.slice(0, lastDot),
    extension: normalizedName.slice(lastDot + 1),
  };
}

function sanitizeFileNamePart(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function createDuplicateSafeName(
  fileName: string,
  knownNames: Map<string, number>,
): string {
  const collisionKey = fileName.toLocaleLowerCase();
  const collisionCount = knownNames.get(collisionKey) ?? 0;
  knownNames.set(collisionKey, collisionCount + 1);
  if (collisionCount === 0) return fileName;

  const { baseName, extension } = splitFileName(fileName);
  return `${baseName}-${collisionCount + 1}${extension ? `.${extension}` : ''}`;
}

export function getExportableJobs(session: BulkSession): ImageJob[] {
  return session.jobs.filter(
    (job) =>
      job.output && job.status === 'encoded' && !isJobOutputStale(session, job),
  );
}

export function getBulkExportSummary(session: BulkSession): BulkExportSummary {
  let ready = 0;
  let failed = 0;
  let pending = 0;
  let skipped = 0;
  let totalOriginalSize = 0;
  let totalOutputSize = 0;

  for (const job of session.jobs) {
    if (job.status === 'failed') failed += 1;
    else if (job.status === 'skipped') skipped += 1;
    else if (
      job.output &&
      job.status === 'encoded' &&
      !isJobOutputStale(session, job)
    ) {
      ready += 1;
      totalOriginalSize += job.originalSize;
      totalOutputSize += job.output.size;
    } else {
      pending += 1;
    }
  }

  return {
    ready,
    failed,
    pending,
    skipped,
    totalOriginalSize,
    totalOutputSize,
    percentChange: totalOriginalSize
      ? (totalOutputSize / totalOriginalSize - 1) * 100
      : 0,
  };
}

export function getBulkExportName(session: BulkSession): string {
  return `${session.id || 'sqush-bulk'}-optimized`;
}

export function getBulkOutputFileName(job: ImageJob): string {
  const { baseName } = splitFileName(job.sourceFile.name);
  const outputName = job.output?.file.name ?? '';
  const { extension } = splitFileName(outputName);
  const safeBaseName = sanitizeFileNamePart(baseName) || 'image';
  return extension ? `${safeBaseName}.${extension}` : safeBaseName;
}

export function getBulkExportEntries(session: BulkSession): BulkExportEntry[] {
  const knownNames = new Map<string, number>();
  return getExportableJobs(session).map((job) => {
    const output = job.output!;
    return {
      job,
      fileName: createDuplicateSafeName(getBulkOutputFileName(job), knownNames),
      downloadUrl: output.downloadUrl,
      size: output.size,
    };
  });
}
