import { AlertStatus } from "@/shared/utils/alertStatus";

export interface Alert {
  id: number;
  cameraId: number;
  cameraName: string;
  cameraLocation?: string | null;
  label: string;
  confidence: number;
  imageUrl: string;
  detectedAt: string;
  status: AlertStatus;
}
