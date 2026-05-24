export const defaultImageUpdateDelay = 100;

export interface ImageUpdateScheduleOptions {
  immediate?: boolean;
}

export type ImageUpdateSchedule =
  | { kind: 'immediate' }
  | { kind: 'deferred'; delay: number };

export function getImageUpdateSchedule(
  { immediate }: ImageUpdateScheduleOptions = {},
  delay = defaultImageUpdateDelay,
): ImageUpdateSchedule {
  if (immediate) return { kind: 'immediate' };

  return {
    kind: 'deferred',
    delay,
  };
}
