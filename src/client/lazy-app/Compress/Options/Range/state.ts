export interface RangeState {
  textFocused: boolean;
}

export function getRangeTextFocusState(textFocused: boolean): RangeState {
  return { textFocused };
}

export function getRangeTextValue(
  state: RangeState,
  currentInputValue: string | undefined,
  propValue: preact.JSX.HTMLAttributes['value'],
): preact.JSX.HTMLAttributes['value'] {
  return state.textFocused ? currentInputValue : propValue;
}

export function getRangeInputValueForCommit(value: string): string | undefined {
  return value.trim() ? value : undefined;
}
