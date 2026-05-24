export type LocalStorageKey = 'leftSideSettings' | 'rightSideSettings';

export function readLocalStorage(key: LocalStorageKey): string | undefined {
  return localStorage.getItem(key) ?? undefined;
}

export function writeLocalStorage(key: LocalStorageKey, value: string): void {
  localStorage.setItem(key, value);
}
