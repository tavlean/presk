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

function getPrecision(value: string): number {
  const afterDecimal = value.split('.')[1];
  return afterDecimal ? afterDecimal.length : 0;
}

export function getRangeDisplayPrecision(
  labelPrecision: string,
  step: string,
): number {
  return Number(labelPrecision) || getPrecision(step) || 0;
}

export function getRangeDisplayValue(
  value: number,
  labelPrecision: string,
  step: string,
): string {
  if (value >= 10000) return (value / 1000).toFixed(1) + 'k';

  const precision = getRangeDisplayPrecision(labelPrecision, step);
  return precision ? value.toFixed(precision) : Math.round(value).toString();
}
