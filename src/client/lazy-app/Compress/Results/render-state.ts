import {
  getResultDownloadState,
  type ResultDownloadState,
} from './download-state';
import { getResultSizeState, type ResultSizeState } from './size-state';

export interface ResultRenderState {
  sizeState: ResultSizeState;
  downloadState: ResultDownloadState;
}

export interface ResultRenderStateInput<
  FileType extends { name: string; size: number },
> {
  source:
    | {
        file: FileType;
      }
    | undefined;
  imageFile: FileType | undefined;
  downloadUrl: string | undefined;
  flipSide: boolean;
  showLoadingState: boolean;
}

export function getResultRenderState<
  FileType extends { name: string; size: number },
>({
  source,
  imageFile,
  downloadUrl,
  flipSide,
  showLoadingState,
}: ResultRenderStateInput<FileType>): ResultRenderState {
  const sizeState = getResultSizeState(source, imageFile);
  return {
    sizeState,
    downloadState: getResultDownloadState(
      flipSide,
      sizeState.isOriginal,
      showLoadingState,
      downloadUrl,
      imageFile,
    ),
  };
}
