"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const ADMIN_EMAIL = "a.derose12345@gmail.com";

type Overview = { totalWorkspaces: number; totalClients: number; activeSubscriptions: number; trialAccounts: number; estimatedRevenue: number };
type WS = { id: string; businessName: string; clerkUserId: string; subscriptionStatus: string; createdAt: string; _count: { clients: number } };
type UserRow = { id: string; clerkUserId: string; businessName: string; createdAt: string };
type Revenue = { activeSubscriptions: number; mrr: number; payingWorkspaces: { id: string; businessName: string }[] };

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [section, setSection] = useState<"overview" | "workspaces" | "users" | "revenue">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [workspaces, setWorkspaces] = useState<WS[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) {
      router.replace("/dashboard");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (!isLoaded || user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) return;
    setLoading(true);
    fetch(`/api/admin?section=${section}`)
      .then(r => r.json())
      .then(d => {
        if (section === "overview") setOverview(d.overview);
        if (section === "workspaces") setWorkspaces(d.workspaces ?? []);
        if (section === "users") setUsers(d.users ?? []);
        if (section === "revenue") setRevenue(d.revenue);
      })
      .finally(() => setLoading(false));
  }, [section, isLoaded, user]);

  if (!isLoaded || user?.emailAddresses[0]?.emailAddress !== ADMIN_EMAIL) {
    return <div style={{ minHeight: "100vh", background: "#0F0F0F" }} />;
  }

  function enterWorkspace(wsId: string) {
    document.cookie = `adminViewingWorkspace=${wsId};path=/;max-age=86400`;
    router.push("/dashboard");
  }

  const NAV = [
    { id: "overview" as const, label: "Overview", icon: "📊" },
    { id: "workspaces" as const, label: "Workspaces", icon: "🏢" },
    { id: "users" as const, label: "Users", icon: "👤" },
    { id: "revenue" as const, label: "Revenue", icon: "💰" },
  ];

  const inp: React.CSSProperties = { background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 };

  return (
    <div style={{ minHeight: "100vh", background: "#0F0F0F", color: "#F0F0F0", fontFamily: "system-ui, -apple-system, sans-serif", display: "flex" }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: "#161616", borderRight: "1px solid #2A2A2A", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #2A2A2A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FF6B6B", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#FFF", fontWeight: 900, fontSize: 14 }}>A</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#F0F0F0" }}>Super Admin</div>
              <div style={{ color: "#606060", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>System</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "10px 8px", flex: 1 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setSection(n.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, marginBottom: 2,
              textAlign: "left", fontSize: 13, fontWeight: 500,
              background: section === n.id ? "rgba(255,107,107,0.08)" : "transparent",
              color: section === n.id ? "#FF6B6B" : "#A0A0A0",
              border: "none", cursor: "pointer", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid #2A2A2A" }}>
          <button onClick={() => router.push("/dashboard")} style={{
            width: "100%", padding: "8px 12px", borderRadius: 8,
            background: "transparent", border: "1px solid #2A2A2A",
            color: "#606060", fontSize: 12, cursor: "pointer", textAlign: "left",
          }}>← Back to Dashboard</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>
        {loading ? (
          <div style={{ color: "#606060", padding: "32px 0" }}>Loading...</div>
        ) : section === "overview" && overview ? (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", marginBottom: 24 }}>Overview</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
              {[
                { label: "Workspaces", value: overview.totalWorkspaces },
                { label: "Total Clients", value: overview.totalClients },
                { label: "Active Subs", value: overview.activeSubscriptions },
                { label: "Trial Accounts", value: overview.trialAccounts },
                { label: "Est. MRR", value: `$${overview.estimatedRevenue.toLocaleString()}` },
              ].map(s => (
                <div key={s.label} style={inp}>
                  <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 300, color: "#F0F0F0" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : section === "workspaces" ? (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", marginBottom: 24 }}>Workspaces</h1>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2A2A2A" }}>
                    {["Business Name", "Owner ID", "Status", "Clients", "Created", ""].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#606060", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workspaces.map((w, i) => (
                    <tr key={w.id} style={{ borderBottom: i < workspaces.length - 1 ? "1px solid #1E1E1E" : "none" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>{w.businessName}</td>
                      <td style={{ padding: "14px 16px", color: "#606060", fontSize: 12, fontFamily: "monospace" }}>{w.clerkUserId.slice(0, 16)}...</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize",
                          background: w.subscriptionStatus === "active" ? "rgba(200,240,74,0.1)" : w.subscriptionStatus === "trial" ? "rgba(240,169,74,0.1)" : "rgba(128,128,128,0.1)",
                          color: w.subscriptionStatus === "active" ? "#C8F04A" : w.subscriptionStatus === "trial" ? "#F0A94A" : "#808080",
                        }}>{w.subscriptionStatus}</span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "#A0A0A0", fontSize: 13 }}>{w._count.clients}</td>
                      <td style={{ padding: "14px 16px", color: "#606060", fontSize: 12 }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <button onClick={() => enterWorkspace(w.id)} style={{
                          background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
                          color: "#FF6B6B", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                        }}>Enter</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : section === "users" ? (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", marginBottom: 24 }}>Users</h1>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #2A2A2A" }}>
                    {["Clerk User ID", "Business Name", "Workspace ID", "Created"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#606060", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid #1E1E1E" : "none" }}>
                      <td style={{ padding: "14px 16px", color: "#A0A0A0", fontSize: 12, fontFamily: "monospace" }}>{u.clerkUserId}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>{u.businessName}</td>
                      <td style={{ padding: "14px 16px", color: "#606060", fontSize: 12, fontFamily: "monospace" }}>{u.id}</td>
                      <td style={{ padding: "14px 16px", color: "#606060", fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : section === "revenue" && revenue ? (
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", marginBottom: 24 }}>Revenue</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
              <div style={inp}>
                <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Active Subscriptions</div>
                <div style={{ fontSize: 32, fontWeight: 300, color: "#F0F0F0" }}>{revenue.activeSubscriptions}</div>
              </div>
              <div style={inp}>
                <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Monthly Recurring Revenue</div>
                <div style={{ fontSize: 32, fontWeight: 300, color: "#C8F04A" }}>${revenue.mrr.toLocaleString()}</div>
              </div>
            </div>
            {revenue.payingWorkspaces.length > 0 && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "#F0F0F0" }}>Paying Workspaces</div>
                {revenue.payingWorkspaces.map(w => (
                  <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1E1E1E" }}>
                    <span style={{ fontSize: 13, color: "#F0F0F0" }}>{w.businessName}</span>
                    <span style={{ fontSize: 13, color: "#C8F04A" }}>$137/mo</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
