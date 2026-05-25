import type { SideIndex, CopyableSide, CopySideAction } from './side-copy';
import {
  getCopySideAction,
  getCopySideChangeState,
  getOtherSideIndex,
} from './side-copy';

export type SideCopySnack = (
  message: string,
  options: Pick<CopySideAction, 'timeout' | 'actions'>,
) => Promise<string>;

export interface RunCopySideInput<Side extends CopyableSide> {
  index: SideIndex;
  state: { sides: [Side, Side] };
  showSnack: SideCopySnack;
  isUnmounted?: () => boolean;
  onApply: (sides: [Side, Side]) => void;
  onRestore: (sideIndex: SideIndex, oldSide: Side) => void;
  getChangeState?: (
    state: { sides: [Side, Side] },
    index: SideIndex,
  ) => { sides: [Side, Side]; oldSide: Side };
  getAction?: () => CopySideAction;
}

export async function runCopySideToOther<Side extends CopyableSide>({
  index,
  state,
  showSnack,
  isUnmounted = () => false,
  onApply,
  onRestore,
  getChangeState = getCopySideChangeState,
  getAction = getCopySideAction,
}: RunCopySideInput<Side>): Promise<CopySideAction> {
  const result = getChangeState(state, index);
  onApply(result.sides);

  const copyAction = getAction();
  const snackbarResult = await showSnack(copyAction.message, {
    timeout: copyAction.timeout,
    actions: copyAction.actions,
  });

  if (!isUnmounted() && snackbarResult === 'undo') {
    onRestore(getOtherSideIndex(index), result.oldSide);
  }

  return copyAction;
}
