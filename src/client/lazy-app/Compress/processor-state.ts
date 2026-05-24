import type { ProcessorState } from '../feature-meta';
import { cleanSet } from '../util/clean-modify';

export type ProcessorType = keyof ProcessorState;

export function setProcessorEnabled(
  processorState: ProcessorState,
  processor: ProcessorType,
  enabled: boolean,
): ProcessorState {
  return cleanSet(processorState, `${processor}.enabled`, enabled);
}

export function processorStateEquivalent(
  a: ProcessorState,
  b: ProcessorState,
): boolean {
  if (a === b) return true;

  for (const key of Object.keys(a) as Array<keyof ProcessorState>) {
    if (!a[key].enabled && !b[key].enabled) continue;
    if (a[key] !== b[key]) return false;
  }

  return true;
}
