"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Workspace = {
  id: string; businessName: string; businessType: string;
  brandColor: string; subscriptionStatus: string;
};

const inp: React.CSSProperties = {
  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export default function SettingsSection() {
  const router = useRouter();
  const [workspace, setWorkspace]   = useState<Workspace | null>(null);
  const [name, setName]             = useState("");
  const [type, setType]             = useState("coach");
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  useEffect(() => {
    fetch("/api/workspace")
      .then(r => r.json())
      .then(d => {
        setWorkspace(d.workspace);
        setName(d.workspace?.businessName ?? "");
        setType(d.workspace?.businessType ?? "coach");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/workspace", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: name, businessType: type }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div style={{ color: "#606060", padding: "32px 0" }}>Loading settings...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", marginBottom: 24 }}>Settings</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 720 }}>
        {/* Workspace Settings */}
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 15, color: "#F0F0F0" }}>Workspace</div>
          <form onSubmit={save}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Business Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your business name" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Business Type</label>
              <select value={type} onChange={e => setType(e.target.value)} style={inp}>
                <option value="coach">Coach</option>
                <option value="consultant">Consultant</option>
                <option value="agency">Agency</option>
                <option value="mentorship">Mentorship</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button type="submit" disabled={saving} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saved && <span style={{ color: "#C8F04A", fontSize: 13 }}>✓ Saved</span>}
            </div>
          </form>
        </div>

        {/* Plan & Billing */}
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 15, color: "#F0F0F0" }}>Plan & Billing</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#606060", marginBottom: 6 }}>Current Plan</div>
            <span style={{
              display: "inline-block", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 99,
              background: workspace?.subscriptionStatus === "trial" ? "rgba(240,169,74,0.1)" : "rgba(200,240,74,0.1)",
              color: workspace?.subscriptionStatus === "trial" ? "#F0A94A" : "#C8F04A",
              textTransform: "capitalize",
            }}>
              {workspace?.subscriptionStatus ?? "Trial"}
            </span>
          </div>
          {workspace?.subscriptionStatus === "trial" && (
            <div style={{ fontSize: 12, color: "#A0A0A0", marginBottom: 18 }}>
              You're on the free trial. Upgrade to unlock unlimited clients and automations.
            </div>
          )}
          <button onClick={() => router.push("/billing")} style={{
            background: "rgba(200,240,74,0.08)", border: "1px solid rgba(200,240,74,0.2)",
            color: "#C8F04A", fontWeight: 600, padding: "10px 20px", borderRadius: 8,
            cursor: "pointer", fontSize: 13, width: "100%",
          }}>
            ✦ View Plans & Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
