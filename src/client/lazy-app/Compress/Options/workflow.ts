import type { SupportedEncoderMap } from './encoder-support';
import { getSupportedEncoderMapLoadedState } from './state';
import type { SavedSideSettingsEventKey } from './saved-settings-state';

export interface RunSupportedEncoderLoadWorkflowInput {
  supportedEncoderMapPromise: Promise<SupportedEncoderMap>;
  isUnmounted: () => boolean;
  onLoaded: (
    state: ReturnType<typeof getSupportedEncoderMapLoadedState>,
  ) => void;
}

export function runSupportedEncoderLoadWorkflow({
  supportedEncoderMapPromise,
  isUnmounted,
  onLoaded,
}: RunSupportedEncoderLoadWorkflowInput): Promise<void> {
  return supportedEncoderMapPromise.then((supportedEncoderMap) => {
    if (isUnmounted()) return;
    onLoaded(getSupportedEncoderMapLoadedState(supportedEncoderMap));
  });
}

export interface SavedSideSettingsListeners {
  leftSideSettings: () => void;
  rightSideSettings: () => void;
}

export interface SavedSideSettingsEventTarget {
  addEventListener: (
    eventKey: SavedSideSettingsEventKey,
    listener: () => void,
  ) => void;
  removeEventListener: (
    eventKey: SavedSideSettingsEventKey,
    listener: () => void,
  ) => void;
}

export function addSavedSideSettingsListeners(
  eventTarget: SavedSideSettingsEventTarget,
  listeners: SavedSideSettingsListeners,
): void {
  eventTarget.addEventListener('leftSideSettings', listeners.leftSideSettings);
  eventTarget.addEventListener(
    'rightSideSettings',
    listeners.rightSideSettings,
  );
}

export function removeSavedSideSettingsListeners(
  eventTarget: SavedSideSettingsEventTarget,
  listeners: SavedSideSettingsListeners,
): void {
  eventTarget.removeEventListener(
    'leftSideSettings',
    listeners.leftSideSettings,
  );
  eventTarget.removeEventListener(
    'rightSideSettings',
    listeners.rightSideSettings,
  );
}
