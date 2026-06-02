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

export interface PreviewReservation {
  reserved: boolean;
  cameraId: number;
  ttlSec: number;
  keepaliveSec: number;
  reason: string | null;
}

export interface PreviewReservationsResponse {
  reservations: PreviewReservation[];
}

export interface CameraFormState {
  name: string;
  rtspUrl: string;
  location: string;
}
