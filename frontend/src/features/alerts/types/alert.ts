export interface Alert {
  id: number;
  cameraId: number;
  cameraName: string;
  label: string;
  confidence: number;
  imageUrl: string;
  detectedAt: string;
  status: string;
}
