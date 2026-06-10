import DeleteButton from "@/features/alerts/components/DeleteButton";
import ResolveButton from "@/features/alerts/components/ResolveButton";
import { Alert } from "@/features/alerts/types/alert";
import AlertEventsTable from "@/shared/components/AlertEventsTable";
import { isNewAlertStatus } from "@/shared/utils/alertStatus";

interface AlertsTableProps {
  alerts: Alert[];
  loading: boolean;
  onOpenAlert: (id: number) => void;
  onDeleteAlert: (id: number) => void;
  onResolveAlert: (id: number) => void;
}

export default function AlertsTable({ alerts, loading, onOpenAlert, onDeleteAlert, onResolveAlert }: AlertsTableProps) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" }}>
      <AlertEventsTable
        alerts={alerts}
        loading={loading}
        onOpenAlert={onOpenAlert}
        renderActions={alert => (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <ResolveButton
              onClick={event => {
                event.stopPropagation();
                if (isNewAlertStatus(alert.status)) {
                  onResolveAlert(alert.id);
                }
              }}
              status={alert.status}
              title={isNewAlertStatus(alert.status) ? "Đánh dấu đã xử lý" : "Cảnh báo đã xử lý"}
            />
            <DeleteButton
              onClick={event => {
                event.stopPropagation();
                if (confirm(`Xóa cảnh báo #${alert.id}?`)) {
                  onDeleteAlert(alert.id);
                }
              }}
              title="Xóa cảnh báo"
            >
              Xóa
            </DeleteButton>
          </div>
        )}
      />
    </div>
  );
}
