export interface LoadingFileInfo {
  loading: boolean;
  filename?: string;
}

export const loadingIndicator = '⏳ ';

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
