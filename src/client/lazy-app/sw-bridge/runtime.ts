// Service-worker registration helper, the surviving piece of Squoosh's
// sw-bridge. The rest of the bridge (getSharedImage/offliner/mainAppLoaded and
// their 'share-ready' / 'skip-waiting' / 'cache-all' messages) was deleted as
// dead surface: nothing called it, and the SvelteKit service worker has no
// message handlers — its install is self-contained (variant-aware precache,
// see src/service-worker.ts).

function getServiceWorkerContainer(
  serviceWorker?: ServiceWorkerContainer,
): ServiceWorkerContainer | undefined {
  if (serviceWorker) return serviceWorker;
  if (typeof navigator === 'undefined') return undefined;
  return navigator.serviceWorker;
}

export async function registerServiceWorkerUrl(
  serviceWorkerUrl: string,
  {
    isProduction,
    serviceWorker,
  }: { isProduction: boolean; serviceWorker?: ServiceWorkerContainer },
): Promise<ServiceWorkerRegistration | undefined> {
  const container = getServiceWorkerContainer(serviceWorker);
  if (!isProduction || !container) return undefined;
  return container.register(serviceWorkerUrl);
}
