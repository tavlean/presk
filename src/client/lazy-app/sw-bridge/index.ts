import type SnackBarElement from 'shared/custom-els/snack-bar';

import { get, set } from 'idb-keyval';

import swUrl from 'service-worker:sw';
import { createServiceWorkerBridge } from './runtime';

const bridge = createServiceWorkerBridge({
  serviceWorkerUrl: swUrl,
  isProduction: __PRODUCTION__,
  getUserInteracted: () => get<boolean | undefined>('user-interacted'),
  setUserInteracted: (value) => set('user-interacted', value),
});

export const getSharedImage = bridge.getSharedImage;
export const mainAppLoaded = bridge.mainAppLoaded;
export const offliner: (showSnack: SnackBarElement['showSnackbar']) => void =
  bridge.offliner;
