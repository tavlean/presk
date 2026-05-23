import { createImageJob, ImageJob } from './session';

const supportedImageExtensions = new Set([
  'avif',
  'gif',
  'jpeg',
  'jpg',
  'jxl',
  'png',
  'qoi',
  'svg',
  'webp',
  'wp2',
]);

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1 || lastDot === fileName.length - 1) return '';
  return fileName.slice(lastDot + 1).toLocaleLowerCase();
}

export function isSupportedBulkImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return supportedImageExtensions.has(getFileExtension(file.name));
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
