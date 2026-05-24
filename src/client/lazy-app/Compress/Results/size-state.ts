import prettyBytes from './pretty-bytes';

export interface ResultSizeFile {
  size: number;
}

export interface ResultSizeSource<FileType extends ResultSizeFile> {
  file: FileType;
}

export interface ResultSizeState {
  prettySize?: {
    value: string;
    unit: string;
  };
  isOriginal: boolean;
  diff?: number;
  direction?: 'down' | 'up';
  percent: number;
}

export function getResultSizeState<FileType extends ResultSizeFile>(
  source: ResultSizeSource<FileType> | undefined,
  imageFile: FileType | undefined,
): ResultSizeState {
  const prettySize = imageFile && prettyBytes(imageFile.size);
  const isOriginal = !source || !imageFile || source.file === imageFile;
  let diff: number | undefined;
  let percent = 0;

  if (source && imageFile) {
    diff = imageFile.size / source.file.size;
    const absolutePercent = Math.round(Math.abs(diff) * 100);
    percent = diff > 1 ? absolutePercent - 100 : 100 - absolutePercent;
  }

  return {
    prettySize,
    isOriginal,
    diff,
    direction: diff && diff !== 1 ? (diff < 1 ? 'down' : 'up') : undefined,
    percent,
  };
}
