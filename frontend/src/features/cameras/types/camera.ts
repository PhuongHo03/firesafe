export interface Camera {
  id: number;
  name: string;
  rtspUrl: string;
  location: string;
  active: boolean;
}

export interface CameraDetectionStatus {
  cameraId: number;
  running: boolean;
  error: string | null;
  lastAlertAt?: string | null;
  hasFrame?: boolean;
}

export interface CameraFormState {
  name: string;
  rtspUrl: string;
  location: string;
}
