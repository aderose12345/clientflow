"use client";
import { useState, useEffect, useCallback } from "react";
import { DEFAULT_AUTOMATIONS, AUTOMATION_LABELS } from "@/lib/constants";

type Rule = { id: string; triggerType: string; messageTemplate: string; channel: string; active: boolean };

export default function AutomationsSection() {
  const [rules, setRules]       = useState<Rule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/automations");
    const d = await res.json();
    setRules(d.rules ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function seedDefaults() {
    setSeeding(true);
    await Promise.all(
      DEFAULT_AUTOMATIONS.map(a =>
        fetch("/api/automations", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(a),
        })
      )
    );
    setSeeding(false);
    fetchRules();
  }

  async function toggleRule(rule: Rule) {
    setTogglingId(rule.id);
    // Optimistic update
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
    const res = await fetch(`/api/automations/${rule.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (!res.ok) {
      // Revert on error
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: rule.active } : r));
    }
    setTogglingId(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", margin: 0, marginBottom: 4 }}>Automations</h1>
          <p style={{ color: "#606060", fontSize: 13, margin: 0 }}>Rule-based email reminders triggered by client activity.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#606060", padding: "32px 0" }}>Loading automations...</div>
      ) : rules.length === 0 ? (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>No automations yet</div>
          <div style={{ color: "#A0A0A0", marginBottom: 24 }}>Set up default automations to keep your clients engaged.</div>
          <button onClick={seedDefaults} disabled={seeding} style={{
            background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
            padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
            opacity: seeding ? 0.7 : 1,
          }}>
            {seeding ? "Setting up..." : "Initialize Default Automations"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map(rule => (
            <div key={rule.id} style={{
              background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10,
              padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
              opacity: rule.active ? 1 : 0.5, transition: "opacity 0.2s",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", marginBottom: 3 }}>
                  {AUTOMATION_LABELS[rule.triggerType] ?? rule.triggerType}
                </div>
                <div style={{ fontSize: 12, color: "#606060" }}>{rule.messageTemplate}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 20 }}>
                <span style={{ fontSize: 11, color: "#606060" }}>{rule.active ? "Active" : "Paused"}</span>
                {/* Toggle */}
                <button
                  onClick={() => togglingId !== rule.id && toggleRule(rule)}
                  disabled={togglingId === rule.id}
                  style={{
                    width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
                    background: rule.active ? "#C8F04A" : "#2A2A2A",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 4, width: 16, height: 16, borderRadius: "50%",
                    background: rule.active ? "#0F0F0F" : "#606060",
                    left: rule.active ? 24 : 4, transition: "left 0.2s",
                  }} />
                </button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(200,240,74,0.04)", border: "1px solid rgba(200,240,74,0.1)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: "#606060" }}>
              💡 <strong style={{ color: "#A0A0A0" }}>Note:</strong> Automations toggle on/off here. Actual email delivery requires{" "}
              <code style={{ background: "#1E1E1E", padding: "1px 5px", borderRadius: 3 }}>RESEND_API_KEY</code> and a verified sender domain.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
