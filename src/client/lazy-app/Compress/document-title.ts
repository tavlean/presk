export interface LoadingFileInfo {
  loading: boolean;
  filename?: string;
}

export interface LoadingSide {
  loading: boolean;
}

export interface LoadingState {
  source?: {
    file: {
      name: string;
    };
  };
  sides: [LoadingSide, LoadingSide];
  loading: boolean;
}

export const loadingIndicator = '⏳ ';

export function isEditorLoading(state: LoadingState): boolean {
  return state.loading || state.sides[0].loading || state.sides[1].loading;
}

export function shouldUpdateDocumentTitle(
  previousState: LoadingState,
  currentState: LoadingState,
): boolean {
  return (
    isEditorLoading(previousState) !== isEditorLoading(currentState) ||
    previousState.source !== currentState.source
  );
}

export function getLoadingFileInfo(state: LoadingState): LoadingFileInfo {
  return {
    loading: isEditorLoading(state),
    filename: state.source?.file.name,
  };
}

export function getDocumentTitle(
  originalTitle: string,
  loadingFileInfo: LoadingFileInfo,
): string {
  const { loading, filename } = loadingFileInfo;
  let title = '';
  if (loading) title += loadingIndicator;
  if (filename) title += filename + ' - ';
  return title + originalTitle;
}
