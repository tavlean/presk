import {
  getImageUpdateSchedule,
  type ImageUpdateScheduleOptions,
} from './update-scheduler';

export interface ImageUpdateTimers {
  clearTimeout: (timeout: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
}

export interface QueueImageUpdateInput {
  currentTimeout?: number;
  options?: ImageUpdateScheduleOptions;
  runUpdate: () => void;
  timers?: ImageUpdateTimers;
}

const defaultTimers: ImageUpdateTimers = {
  clearTimeout: (timeout) => window.clearTimeout(timeout),
  setTimeout: (callback, delay) => window.setTimeout(callback, delay),
};

export function queueImageUpdate({
  currentTimeout,
  options,
  runUpdate,
  timers = defaultTimers,
}: QueueImageUpdateInput): number | undefined {
  const schedule = getImageUpdateSchedule(options);

  if (currentTimeout !== undefined) {
    timers.clearTimeout(currentTimeout);
  }

  if (schedule.kind === 'immediate') {
    runUpdate();
    return undefined;
  }

  return timers.setTimeout(runUpdate, schedule.delay);
}
