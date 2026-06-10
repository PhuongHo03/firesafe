"use client";

import { useRouter, useParams } from "next/navigation";
import AlertDetailCard from "@/features/alerts/components/AlertDetailCard";
import DeleteButton from "@/features/alerts/components/DeleteButton";
import ResolveButton from "@/features/alerts/components/ResolveButton";
import { useAlert } from "@/features/alerts/hooks/useAlert";
import Sidebar from "@/layouts/Sidebar";
import { isNewAlertStatus } from "@/shared/utils/alertStatus";
import { ArrowLeft, Flame } from "lucide-react";

export default function AlertDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const { alert, loading, error, resolveAlert, deleteAlert } = useAlert(id);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main className="alert-detail-page">
        <button id="back-btn" onClick={() => router.back()} className="alert-detail-back">
          <ArrowLeft size={16} /> Quay lại
        </button>

        {loading && <p style={{ color: "var(--text-muted)" }}>Đang tải...</p>}
        {error && <p style={{ color: "var(--accent)" }}>{error}</p>}

        {alert && (
          <div className="alert-detail-shell">
            <div className="alert-detail-header">
              <h1 className="alert-detail-title">
                <Flame size={26} color="var(--accent)" /> Cảnh báo #{alert.id}
              </h1>
              <div className="alert-detail-actions">
                <ResolveButton
                  onClick={resolveAlert}
                  size="md"
                  status={alert.status}
                  title={isNewAlertStatus(alert.status) ? "Đánh dấu đã xử lý" : "Cảnh báo đã xử lý"}
                />
                <DeleteButton
                  onClick={() => {
                    if (confirm(`Xóa cảnh báo #${alert.id}?`)) {
                      deleteAlert();
                    }
                  }}
                  size="md"
                >
                  Xóa
                </DeleteButton>
              </div>
            </div>

            <AlertDetailCard alert={alert} />
          </div>
        )}
        <style jsx>{`
          .alert-detail-page {
            flex: 1;
            min-width: 0;
            height: 100vh;
            overflow-y: auto;
            padding: clamp(1rem, 2vw, 2rem);
          }

          .alert-detail-back {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            margin-bottom: clamp(1rem, 2vh, 1.5rem);
            font-size: 0.95rem;
            padding: 0;
          }

          .alert-detail-shell {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            gap: clamp(1rem, 2vh, 1.5rem);
            min-height: calc(100vh - 7rem);
            width: 100%;
          }

          .alert-detail-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
          }

          .alert-detail-title {
            margin: 0;
            font-size: clamp(1.55rem, 2vw, 2.3rem);
            font-weight: 750;
            display: flex;
            align-items: center;
            gap: 0.65rem;
            line-height: 1.1;
          }

          .alert-detail-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          @media (max-width: 760px) {
            .alert-detail-page {
              height: auto;
              min-height: 100vh;
              overflow-y: visible;
            }

            .alert-detail-shell {
              min-height: 0;
            }

            .alert-detail-header {
              align-items: flex-start;
              flex-direction: column;
            }

            .alert-detail-actions {
              justify-content: flex-start;
            }
          }
        `}</style>
      </main>
    </div>
  );
}
