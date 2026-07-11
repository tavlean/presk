import type { ProcessorState } from 'client/lazy-app/feature-meta/shared';
import { defineControl, type BulkControl } from './types';

type GrainOptions = ProcessorState['grain'];

export const grainControls: readonly BulkControl<GrainOptions>[] = [
  defineControl({
    id: 'grain.amount',
    label: 'Grain',
    fields: ['amount'],
  }),
];
