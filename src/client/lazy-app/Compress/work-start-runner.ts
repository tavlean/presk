import {
  getActiveImageJobsAfterStarts,
  getImageWorkAbortPlan,
  type ActiveTwoSideJobs,
  type ImageWorkAbortPlan,
  type ImageWorkStarts,
} from './work-plan';

export interface ImageWorkRuntimeState extends ActiveTwoSideJobs {
  mainAbortController: AbortController;
  sideAbortControllers: [AbortController, AbortController];
}

export interface StartedImageWorkRuntime extends ImageWorkRuntimeState {
  abortPlan: ImageWorkAbortPlan;
  mainSignal: AbortSignal;
  sideSignals: [AbortSignal, AbortSignal];
}

export function startImageWork(
  {
    mainJob,
    sideJobs,
    mainAbortController,
    sideAbortControllers,
  }: ImageWorkRuntimeState,
  workStarts: ImageWorkStarts,
  createAbortController: () => AbortController = () => new AbortController(),
): StartedImageWorkRuntime {
  const abortPlan = getImageWorkAbortPlan(workStarts);
  const activeJobs = getActiveImageJobsAfterStarts(
    {
      mainJob,
      sideJobs,
    },
    workStarts,
  );

  let nextMainAbortController = mainAbortController;
  if (abortPlan.main) {
    mainAbortController.abort();
    nextMainAbortController = createAbortController();
  }

  const nextSideAbortControllers = sideAbortControllers.slice() as [
    AbortController,
    AbortController,
  ];
  for (const [index, shouldAbort] of abortPlan.sides.entries()) {
    if (!shouldAbort) continue;
    sideAbortControllers[index].abort();
    nextSideAbortControllers[index] = createAbortController();
  }

  const nextSideJobs = activeJobs.sideJobs.slice() as [
    ActiveTwoSideJobs['sideJobs'][0],
    ActiveTwoSideJobs['sideJobs'][1],
  ];

  return {
    mainJob: activeJobs.mainJob,
    sideJobs: nextSideJobs,
    mainAbortController: nextMainAbortController,
    sideAbortControllers: nextSideAbortControllers,
    abortPlan,
    mainSignal: nextMainAbortController.signal,
    sideSignals: [
      nextSideAbortControllers[0].signal,
      nextSideAbortControllers[1].signal,
    ],
  };
}
