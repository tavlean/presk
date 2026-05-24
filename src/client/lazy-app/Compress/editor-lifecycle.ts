import {
  getLoadingFileInfo,
  shouldUpdateDocumentTitle,
  type LoadingFileInfo,
  type LoadingState,
} from './document-title';

export interface EditorFileProps {
  file: File;
}

export interface EditorUpdateEffects {
  sourceFile?: File;
  loadingFileInfo?: LoadingFileInfo;
  queueUpdate: 'immediate' | 'deferred';
}

export function getEditorUpdateEffects(
  previousProps: EditorFileProps,
  currentProps: EditorFileProps,
  previousState: LoadingState,
  currentState: LoadingState,
): EditorUpdateEffects {
  if (previousProps.file !== currentProps.file) {
    return {
      sourceFile: currentProps.file,
      queueUpdate: 'immediate',
    };
  }

  return {
    loadingFileInfo: shouldUpdateDocumentTitle(previousState, currentState)
      ? getLoadingFileInfo(currentState)
      : undefined,
    queueUpdate: 'deferred',
  };
}
