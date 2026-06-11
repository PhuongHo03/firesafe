"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Flame, LayoutDashboard, Camera, LogOut, ListChecks, Users, ScrollText } from "lucide-react";
import { alertsApi } from "@/features/alerts/api/alertsApi";
import { subscribeAlertCountChanged } from "@/features/alerts/events/alertEvents";
import { camerasApi } from "@/features/cameras/api/camerasApi";
import { clearAuth, getToken, getUser } from "@/shared/utils/auth";

const ALERT_BADGE_REFRESH_MS = 3_000;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [newAlertCount, setNewAlertCount] = useState(0);

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadNewAlertCount() {
      const token = getToken();
      if (!token) {
        if (mounted) setNewAlertCount(0);
        return;
      }

      try {
        const data = await alertsApi.getNewAlertCount(token);
        if (mounted) setNewAlertCount(data.newCount);
      } catch {
        if (mounted) setNewAlertCount(0);
      }
    }

    void loadNewAlertCount();
    const unsubscribe = subscribeAlertCountChanged(loadNewAlertCount);
    const id = setInterval(loadNewAlertCount, ALERT_BADGE_REFRESH_MS);
    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(id);
    };
  }, []);

  function logout() {
    const token = getToken();
    if (token) {
      void camerasApi.releaseAllCameraPreviews(token).catch(() => undefined);
    }
    clearAuth();
    router.push("/login");
  }

  const links = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/alerts", icon: ListChecks, label: "Alerts" },
    { href: "/cameras", icon: Camera, label: "Cameras" },
    { href: "/logs", icon: ScrollText, label: "Logs" },
  ];

  return (
    <aside style={{
      width: "220px",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "1.25rem 0",
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: "0 1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Flame size={22} color="var(--accent)" />
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>FireSafe</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0 0.75rem" }}>
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              padding: "0.6rem 0.75rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
              color: active ? "#fff" : "var(--text-muted)",
              background: active ? "var(--accent-dim)" : "transparent",
              fontWeight: active ? 600 : 400,
              fontSize: "0.9rem",
              transition: "background 0.15s, color 0.15s",
            }}>
              <Icon size={17} color={active ? "var(--accent)" : undefined} />
              <span style={{ flex: 1, minWidth: 0 }}>{label}</span>
              {href === "/alerts" && newAlertCount > 0 && (
                <span
                  aria-label={`${newAlertCount} cảnh báo mới`}
                  style={{
                    minWidth: "1.25rem",
                    height: "1.25rem",
                    padding: "0 0.35rem",
                    borderRadius: 999,
                    background: "var(--accent)",
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    lineHeight: 1,
                    boxShadow: "0 0 0 2px var(--surface)",
                  }}
                >
                  {newAlertCount > 99 ? "99+" : newAlertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "0 1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
          <div style={{ color: "var(--text)", fontWeight: 600 }}>{user?.username}</div>
          <div>{user?.email}</div>
        </div>
        <button id="logout-btn" onClick={logout} style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "0.5rem",
          padding: "0.5rem 0.75rem",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}>
          <LogOut size={15} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
