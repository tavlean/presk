import { cleanMerge, cleanSet } from '../util/clean-modify';
import { defaultProcessorState, encoderMap } from '../feature-meta';
import type { SavedSideSettings, SideSettings } from './saved-settings';

export type SideIndex = 0 | 1;

export interface ResettableSideState {
  file?: unknown;
  downloadUrl?: string;
  data?: unknown;
  processed?: unknown;
  encodedSettings?: unknown;
}

export interface ResettableTwoSideState<Side extends ResettableSideState> {
  sides: [Side, Side];
}

export interface SavedSettingsSide {
  latestSettings: unknown;
  encodedSettings?: unknown;
}

export interface InitialSideState {
  latestSettings: SideSettings;
  encodedSettings?: SideSettings;
  loading: boolean;
}

export interface SavedSideSettingsUpdate<Side extends SavedSettingsSide> {
  sides: [Side, Side];
  oldSide: Side;
}

export function getDefaultSideState(index: SideIndex): InitialSideState {
  return {
    latestSettings: {
      processorState: defaultProcessorState,
      encoderState:
        index === 0
          ? undefined
          : {
              type: 'mozJPEG',
              options: encoderMap.mozJPEG.meta.defaultOptions,
            },
    },
    loading: false,
  };
}

export function getInitialSideState(
  index: SideIndex,
  savedSettings?: SavedSideSettings,
): InitialSideState {
  return {
    ...getDefaultSideState(index),
    ...savedSettings,
    loading: false,
  };
}

export function resetSidesForNewSourceData<
  Side extends ResettableSideState,
  State extends ResettableTwoSideState<Side>,
>(
  state: State,
  revokeObjectUrl: (url: string) => void = URL.revokeObjectURL,
): State {
  let nextState = { ...state };

  for (const i of [0, 1]) {
    const downloadUrl = nextState.sides[i].downloadUrl;
    if (downloadUrl) revokeObjectUrl(downloadUrl);

    nextState = cleanMerge(nextState, `sides.${i}`, {
      processed: undefined,
      file: undefined,
      downloadUrl: undefined,
      data: undefined,
      encodedSettings: undefined,
    });
  }

  return nextState;
}

export function applySavedSideSettings<Side extends SavedSettingsSide>(
  sides: [Side, Side],
  index: 0 | 1,
  savedSettings: SavedSettingsSide,
): SavedSideSettingsUpdate<Side> {
  const oldSide = sides[index];
  return {
    sides: cleanSet(sides, index, {
      ...oldSide,
      ...savedSettings,
    }),
    oldSide,
  };
}
