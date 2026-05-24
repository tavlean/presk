import type { SideIndex, SavedSettingsSide } from './side-state';
import { getApplySavedSideSettingsState } from './side-state';
import type {
  SavableSideSettings,
  SavedSideSettings,
  SavedSideSettingsAction,
  SavedSideSettingsImportAction,
  SavedSideSettingsReadResult,
  SavedSideSettingsSaveAction,
  SavedSideSettingsWriteResult,
} from './saved-settings';
import {
  getSavedSideSettingsImportAction,
  getSavedSideSettingsSaveAction,
  readSavedSideSettingsForSide,
  writeSavedSideSettingsForSide,
} from './saved-settings';

export type SavedSettingsSnackResult = string;

export type SavedSettingsSnack = (
  message: string,
  options: Pick<SavedSideSettingsAction, 'timeout' | 'actions'>,
) => Promise<SavedSettingsSnackResult>;

export interface RunSaveSideSettingsInput<Side extends SavableSideSettings> {
  index: SideIndex;
  side: Side;
  showSnack: SavedSettingsSnack;
  dispatchSavedSettingsEvent?: (eventKey: string) => void;
  writeSideSettings?: (
    index: SideIndex,
    side: Side,
  ) => SavedSideSettingsWriteResult;
  getSaveAction?: (
    result: SavedSideSettingsWriteResult,
  ) => SavedSideSettingsSaveAction;
}

export interface RunImportSideSettingsInput<Side extends SavedSettingsSide> {
  index: SideIndex;
  state: { sides: [Side, Side] };
  showSnack: SavedSettingsSnack;
  isUnmounted?: () => boolean;
  onApply: (sides: [Side, Side]) => void;
  onRestore: (side: Side) => void;
  readSideSettings?: (index: SideIndex) => SavedSideSettingsReadResult;
  getImportAction?: (
    result: SavedSideSettingsReadResult,
  ) => SavedSideSettingsImportAction;
  getApplyState?: (
    state: { sides: [Side, Side] },
    index: SideIndex,
    savedSettings: SavedSideSettings,
  ) => { sides: [Side, Side]; oldSide: Side };
}

async function showSavedSettingsAction(
  showSnack: SavedSettingsSnack,
  action: SavedSideSettingsAction,
): Promise<SavedSettingsSnackResult> {
  return showSnack(action.message, {
    timeout: action.timeout,
    actions: action.actions,
  });
}

export async function runSaveSideSettings<Side extends SavableSideSettings>({
  index,
  side,
  showSnack,
  dispatchSavedSettingsEvent,
  writeSideSettings = writeSavedSideSettingsForSide,
  getSaveAction = getSavedSideSettingsSaveAction,
}: RunSaveSideSettingsInput<Side>): Promise<SavedSideSettingsSaveAction> {
  const saveAction = getSaveAction(writeSideSettings(index, side));
  if (saveAction.kind === 'saved') {
    dispatchSavedSettingsEvent?.(saveAction.eventKey);
  }
  await showSavedSettingsAction(showSnack, saveAction);
  return saveAction;
}

export async function runImportSideSettings<Side extends SavedSettingsSide>({
  index,
  state,
  showSnack,
  isUnmounted = () => false,
  onApply,
  onRestore,
  readSideSettings = readSavedSideSettingsForSide,
  getImportAction = getSavedSideSettingsImportAction,
  getApplyState = getApplySavedSideSettingsState,
}: RunImportSideSettingsInput<Side>): Promise<SavedSideSettingsImportAction> {
  const importAction = getImportAction(readSideSettings(index));
  if (importAction.kind !== 'imported') {
    await showSavedSettingsAction(showSnack, importAction);
    return importAction;
  }

  const update = getApplyState(state, index, importAction.settings);
  onApply(update.sides);
  const result = await showSavedSettingsAction(showSnack, importAction);

  if (!isUnmounted() && result === 'undo') {
    onRestore(update.oldSide);
  }

  return importAction;
}
