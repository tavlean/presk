export function hasServiceWorkerController(
  serviceWorker: Pick<ServiceWorkerContainer, 'controller'> | undefined,
): serviceWorker is Pick<ServiceWorkerContainer, 'controller'> & {
  controller: ServiceWorker;
} {
  return Boolean(serviceWorker?.controller);
}
