import {
  getEditorUpdateEffects,
  getEditorUpdateScheduleOptions,
  type EditorFileProps,
} from './editor-lifecycle';
import type { LoadingFileInfo, LoadingState } from './document-title';
import type { ImageUpdateScheduleOptions } from './update-scheduler';

export interface RunEditorUpdateWorkflowInput {
  previousProps: EditorFileProps;
  currentProps: EditorFileProps;
  previousState: LoadingState;
  currentState: LoadingState;
  setSourceFile: (file: File) => void;
  updateDocumentTitle: (loadingFileInfo: LoadingFileInfo) => void;
  queueUpdateImage: (options: ImageUpdateScheduleOptions) => void;
}

export function runEditorUpdateWorkflow({
  previousProps,
  currentProps,
  previousState,
  currentState,
  setSourceFile,
  updateDocumentTitle,
  queueUpdateImage,
}: RunEditorUpdateWorkflowInput): void {
  const updateEffects = getEditorUpdateEffects(
    previousProps,
    currentProps,
    previousState,
    currentState,
  );

  if (updateEffects.sourceFile) {
    setSourceFile(updateEffects.sourceFile);
  }

  if (updateEffects.loadingFileInfo) {
    updateDocumentTitle(updateEffects.loadingFileInfo);
  }

  queueUpdateImage(getEditorUpdateScheduleOptions(updateEffects));
}
