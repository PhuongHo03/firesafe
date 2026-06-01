import { getNextPage, getPreviousPage } from "@/features/alerts/states/alertsState";

interface AlertsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AlertsPagination({ page, totalPages, onPageChange }: AlertsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
      <button id="alerts-page-prev" disabled={page === 0} onClick={() => onPageChange(getPreviousPage(page))} style={pageBtn(page === 0)}>← Trước</button>
      <span style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
        Trang {page + 1} / {totalPages}
      </span>
      <button id="alerts-page-next" disabled={page >= totalPages - 1} onClick={() => onPageChange(getNextPage(page, totalPages))} style={pageBtn(page >= totalPages - 1)}>Tiếp →</button>
    </div>
  );
}

const pageBtn = (disabled: boolean): React.CSSProperties => ({
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  padding: "0.5rem 1rem",
  color: disabled ? "var(--text-muted)" : "var(--text)",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "0.875rem",
  opacity: disabled ? 0.5 : 1,
});
