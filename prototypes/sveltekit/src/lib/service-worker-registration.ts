import { registerServiceWorkerUrl } from '../../../../src/client/lazy-app/sw-bridge/runtime';

export function registerPrototypeServiceWorker(): Promise<
  ServiceWorkerRegistration | undefined
> {
  return registerServiceWorkerUrl('/service-worker.js', {
    isProduction: !import.meta.env.DEV,
  });
}
