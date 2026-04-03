"use client";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import DashboardHome from "./components/DashboardHome";
import ProgramsSection from "./components/ProgramsSection";
import ClientsSection from "./components/ClientsSection";
import AutomationsSection from "./components/AutomationsSection";
import SettingsSection from "./components/SettingsSection";

export default function DashboardPage() {
  const { user } = useUser();
  const [activeNav, setActiveNav] = useState("dashboard");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      <Sidebar
        activeNav={activeNav}
        onNav={setActiveNav}
        userEmail={user?.emailAddresses[0]?.emailAddress}
        subscriptionStatus={undefined}
      />
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {activeNav === "dashboard"   && <DashboardHome onNav={setActiveNav} />}
        {activeNav === "clients"     && <ClientsSection />}
        {activeNav === "programs"    && <ProgramsSection />}
        {activeNav === "automations" && <AutomationsSection />}
        {activeNav === "settings"    && <SettingsSection />}
      </main>
    </div>
  );
}
