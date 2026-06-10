import { useRouter } from "next/navigation";
import { Alert } from "@/features/alerts/types/alert";
import AlertEventsTable from "@/shared/components/AlertEventsTable";

export default function LatestAlertsTable({ alerts, loading }: { alerts: Alert[]; loading: boolean }) {
  const router = useRouter();
  return (
    <section style={{ ...sectionStyle, marginTop: "1.5rem" }}>
      <div style={sectionHeaderStyle}>
        <div>
          <h2 style={sectionTitleStyle}>5 cảnh báo mới nhất</h2>
          <p style={sectionSubtitleStyle}>Quản lý đầy đủ ở trang Alerts</p>
        </div>
        <button onClick={() => router.push("/alerts")} style={secondaryBtn}>Xem tất cả</button>
      </div>
      <AlertEventsTable alerts={alerts} loading={loading} onOpenAlert={id => router.push(`/alerts/${id}`)} />
    </section>
  );
}

const sectionStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem", borderBottom: "1px solid var(--border)" };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 700 };
const sectionSubtitleStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" };
const secondaryBtn: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.45rem 0.8rem", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem" };
