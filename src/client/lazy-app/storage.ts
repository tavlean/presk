export type LocalStorageKey = 'leftSideSettings' | 'rightSideSettings';

export function readLocalStorage(key: LocalStorageKey): string | undefined {
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch (err) {
    return;
  }
}

export function writeLocalStorage(
  key: LocalStorageKey,
  value: string,
): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    return false;
  }
}
