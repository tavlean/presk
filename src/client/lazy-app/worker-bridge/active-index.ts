import activeWorkerURL from 'omt:../../../features-worker/active';
import { createActiveWorkerBridge } from './active-bridge';

const ActiveWorkerBridgeBase = createActiveWorkerBridge(
  () => new Worker(activeWorkerURL),
);

export default class ActiveWorkerBridge extends ActiveWorkerBridgeBase {}
