import { ChartDatum } from "@/features/dashboard/types/dashboard";

export default function ChartCard({ title, subtitle, data }: { title: string; subtitle: string; data: ChartDatum[] }) {
  const max = Math.max(1, ...data.map(item => item.value));
  return <section style={{ ...sectionStyle, padding: "1rem" }}><h2 style={sectionTitleStyle}>{title}</h2><p style={sectionSubtitleStyle}>{subtitle}</p><div style={{ display: "flex", alignItems: "end", gap: "0.35rem", height: 160, marginTop: "1rem" }}>{data.length === 0 ? <div style={emptyTd}>Chưa có dữ liệu</div> : data.map(item => <div key={item.label} title={`${item.label}: ${item.value}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}><div style={{ width: "100%", minHeight: 3, height: `${Math.max(3, item.value / max * 120)}px`, background: "linear-gradient(180deg, var(--accent), var(--yellow))", borderRadius: "0.25rem 0.25rem 0 0" }} /><span style={{ color: "var(--text-muted)", fontSize: "0.68rem", writingMode: data.length > 10 ? "vertical-rl" : "horizontal-tb" }}>{item.label}</span></div>)}</div></section>;
}

const sectionStyle: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", overflow: "hidden" };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: "1rem", fontWeight: 700 };
const sectionSubtitleStyle: React.CSSProperties = { margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.8rem" };
const emptyTd: React.CSSProperties = { textAlign: "center", padding: "3rem", color: "var(--text-muted)" };
