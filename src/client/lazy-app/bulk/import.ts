import { createImageJob, ImageJob } from './session';

export function isSupportedBulkImage(file: File): boolean {
  return file.type.startsWith('image/');
}

export function createImageJobId(file: File, index: number): string {
  return `${index}-${file.name}-${file.size}-${file.lastModified}`;
}

export function createImageJobs(files: Iterable<File>): {
  accepted: ImageJob[];
  rejected: File[];
} {
  const accepted: ImageJob[] = [];
  const rejected: File[] = [];

  for (const file of files) {
    if (!isSupportedBulkImage(file)) {
      rejected.push(file);
      continue;
    }

    accepted.push(
      createImageJob(createImageJobId(file, accepted.length), file),
    );
  }

  return { accepted, rejected };
}
