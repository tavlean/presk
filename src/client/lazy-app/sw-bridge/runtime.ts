import { hasServiceWorkerController } from './support';

type ShowSnackbar = (
  message: string,
  options?: { timeout?: number; actions?: string[] },
) => Promise<string | undefined> | string | undefined;

interface ServiceWorkerBridgeOptions {
  serviceWorkerUrl: string;
  isProduction: boolean;
  serviceWorker?: ServiceWorkerContainer;
  location?: Pick<Location, 'reload'>;
  getUserInteracted?: () => Promise<boolean | undefined>;
  setUserInteracted?: (value: boolean) => Promise<unknown> | unknown;
}

function getServiceWorkerContainer(
  serviceWorker?: ServiceWorkerContainer,
): ServiceWorkerContainer | undefined {
  if (serviceWorker) return serviceWorker;
  if (typeof navigator === 'undefined') return undefined;
  return navigator.serviceWorker;
}

export function supportsServiceWorker(
  serviceWorker = getServiceWorkerContainer(),
): serviceWorker is ServiceWorkerContainer {
  return Boolean(serviceWorker);
}

export async function registerServiceWorkerUrl(
  serviceWorkerUrl: string,
  {
    isProduction,
    serviceWorker,
  }: Pick<ServiceWorkerBridgeOptions, 'isProduction' | 'serviceWorker'>,
): Promise<ServiceWorkerRegistration | undefined> {
  const container = getServiceWorkerContainer(serviceWorker);
  if (!isProduction || !supportsServiceWorker(container)) return undefined;
  return container.register(serviceWorkerUrl);
}

/** Tell the service worker to skip waiting */
async function skipWaiting(serviceWorker: ServiceWorkerContainer) {
  const reg = await serviceWorker.getRegistration();
  if (!reg || !reg.waiting) return;
  reg.waiting.postMessage('skip-waiting');
}

/** Find the service worker that's 'active' or closest to 'active' */
async function getMostActiveServiceWorker(
  serviceWorker: ServiceWorkerContainer,
) {
  const reg = await serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.active || reg.waiting || reg.installing;
}

/** Wait for an installing worker */
async function installingWorker(
  reg: ServiceWorkerRegistration,
): Promise<ServiceWorker> {
  if (reg.installing) return reg.installing;
  return new Promise<ServiceWorker>((resolve) => {
    reg.addEventListener('updatefound', () => resolve(reg.installing!), {
      once: true,
    });
  });
}

/** Wait a service worker to become waiting */
async function updateReady(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.waiting) return;
  const installing = await installingWorker(reg);
  return new Promise<void>((resolve) => {
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed') resolve();
    });
  });
}

export function createServiceWorkerBridge(options: ServiceWorkerBridgeOptions) {
  const getContainer = () => getServiceWorkerContainer(options.serviceWorker);

  return {
    /** Wait for a shared image */
    getSharedImage(): Promise<File> {
      const serviceWorker = getContainer();
      if (!supportsServiceWorker(serviceWorker)) {
        return Promise.reject(Error('Service workers are not available'));
      }
      if (!hasServiceWorkerController(serviceWorker)) {
        return Promise.reject(
          Error('Service worker controller is not available'),
        );
      }
      const { controller } = serviceWorker;

      return new Promise((resolve) => {
        const onmessage = (event: MessageEvent) => {
          if (event.data.action !== 'load-image') return;
          resolve(event.data.file);
          serviceWorker.removeEventListener('message', onmessage);
        };

        serviceWorker.addEventListener('message', onmessage);

        // This message is picked up by the service worker - it's how it knows we're ready to receive
        // the file.
        controller.postMessage('share-ready');
      });
    },

    /** Set up the service worker and monitor changes */
    async offliner(showSnack: ShowSnackbar) {
      const serviceWorker = getContainer();
      if (!supportsServiceWorker(serviceWorker)) return;
      registerServiceWorkerUrl(options.serviceWorkerUrl, {
        isProduction: options.isProduction,
        serviceWorker,
      });

      const hasController = !!serviceWorker.controller;

      // Look for changes in the controller
      serviceWorker.addEventListener('controllerchange', async () => {
        // Is it the first install?
        if (!hasController) {
          showSnack('Ready to work offline', { timeout: 5000 });
          return;
        }

        // Otherwise reload (the user will have agreed to this).
        (options.location || location).reload();
      });

      // If we don't have a controller, we don't need to check for updates – we've just loaded from the
      // network.
      if (!hasController) return;

      const reg = await serviceWorker.getRegistration();
      // Service worker not registered yet.
      if (!reg) return;
      // Look for updates
      await updateReady(reg);

      // Ask the user if they want to update.
      const result = await showSnack('Update available', {
        actions: ['reload', 'dismiss'],
      });

      // Tell the waiting worker to activate, this will change the controller and cause a reload (see
      // 'controllerchange')
      if (result === 'reload') skipWaiting(serviceWorker);
    },

    /**
     * Tell the service worker the main app has loaded. If it's the first time the service worker has
     * heard about this, cache the heavier assets like codecs.
     */
    async mainAppLoaded() {
      const serviceWorker = getContainer();
      if (!supportsServiceWorker(serviceWorker)) return;
      // If the user has already interacted, no need to tell the service worker anything.
      const userInteracted = await options.getUserInteracted?.();
      if (userInteracted) return;
      options.setUserInteracted?.(true);
      const activeServiceWorker = await getMostActiveServiceWorker(
        serviceWorker,
      );
      if (!activeServiceWorker) return; // Service worker not installing yet.
      activeServiceWorker.postMessage('cache-all');
    },
  };
}
