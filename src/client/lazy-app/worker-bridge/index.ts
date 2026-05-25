import workerURL from 'omt:../../../features-worker';
import { createWorkerBridge } from './bridge';

const WorkerBridgeBase = createWorkerBridge(() => new Worker(workerURL));

export default class WorkerBridge extends WorkerBridgeBase {}
