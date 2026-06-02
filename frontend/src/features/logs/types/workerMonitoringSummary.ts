export interface WorkerMonitoringSummary {
  status: string;
  workers: number;
  sources: number;
  inferenceScheduler: InferenceSchedulerStatus;
  cameras: CameraRuntimeStatus[];
}

export interface InferenceSchedulerStatus {
  running: boolean;
  registeredCameras: number;
  batchMaxSize: number;
  batchMaxWaitMs: number;
  batchesTotal: number;
  framesInferredTotal: number;
  avgBatchSize: number;
  avgInferenceMs: number;
  errorsTotal: number;
}

export interface CameraRuntimeStatus {
  cameraId: number;
  running: boolean;
  error: string | null;
  lastAlertAt: string | null;
  hasFrame: boolean;
  detectionsTotal?: number;
  alertsTotal?: number;
  inferenceMsAvg?: number;
}
