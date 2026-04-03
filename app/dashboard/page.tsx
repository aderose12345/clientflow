"use client";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useIsMobile";
import Sidebar from "./components/Sidebar";
import DashboardHome from "./components/DashboardHome";
import ProgramsSection from "./components/ProgramsSection";
import ClientsSection from "./components/ClientsSection";
import AutomationsSection from "./components/AutomationsSection";
import SettingsSection from "./components/SettingsSection";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",   icon: "⌂" },
  { id: "clients",     label: "Clients",     icon: "👥" },
  { id: "programs",    label: "Programs",    icon: "📋" },
  { id: "automations", label: "Automations", icon: "⚡" },
  { id: "settings",    label: "Settings",    icon: "⚙" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/auth/role")
      .then(r => r.json())
      .then(d => {
        if (d.role === "client") { router.replace("/portal"); return; }
        return fetch("/api/onboarding").then(r => r.json()).then(d => {
          if (d.needsOnboarding) router.replace("/onboarding");
          else setReady(true);
        });
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) return <div style={{ minHeight: "100vh", background: "#0F0F0F" }} />;

  const pageTitle = NAV_ITEMS.find(n => n.id === activeNav)?.label ?? "Dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar
          activeNav={activeNav}
          onNav={setActiveNav}
          userEmail={user?.emailAddresses[0]?.emailAddress}
          subscriptionStatus={undefined}
        />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Mobile top header */}
        {isMobile && (
          <div style={{
            height: 56, background: "#161616", borderBottom: "1px solid #2A2A2A",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 16px", flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: "#C8F04A",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "#0F0F0F", fontWeight: 900, fontSize: 14 }}>C</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 16, color: "#F0F0F0" }}>{pageTitle}</span>
            </div>
            <div style={{ fontSize: 11, color: "#606060", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.emailAddresses[0]?.emailAddress}
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, overflow: "auto", padding: isMobile ? 16 : 32 }}>
          {activeNav === "dashboard"   && <DashboardHome onNav={setActiveNav} />}
          {activeNav === "clients"     && <ClientsSection />}
          {activeNav === "programs"    && <ProgramsSection />}
          {activeNav === "automations" && <AutomationsSection />}
          {activeNav === "settings"    && <SettingsSection />}
        </main>

        {/* Mobile bottom nav */}
        {isMobile && (
          <div style={{
            height: 56, background: "#161616", borderTop: "1px solid #2A2A2A",
            display: "flex", alignItems: "center", justifyContent: "space-around",
            flexShrink: 0,
          }}>
            {NAV_ITEMS.map(n => (
              <button key={n.id} onClick={() => setActiveNav(n.id)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 12px", minWidth: 48, minHeight: 44,
                justifyContent: "center",
              }}>
                <span style={{
                  fontSize: 20,
                  filter: activeNav === n.id ? "none" : "grayscale(1) opacity(0.4)",
                  transition: "all 0.15s",
                }}>{n.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.02em",
                  color: activeNav === n.id ? "#C8F04A" : "#606060",
                }}>{n.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
