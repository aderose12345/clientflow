"use client";
import { useState, useEffect, useCallback } from "react";
import { DEFAULT_AUTOMATIONS } from "@/lib/constants";

type Rule = { id: string; triggerType: string; messageTemplate: string; channel: string; active: boolean };
type LogEntry = { id: string; ruleType: string; sentAt: string; client: { firstName: string; lastName: string; email: string } };

// Trigger metadata: human description, icon, category
const TRIGGER_META: Record<string, { label: string; desc: string; icon: string; category: string }> = {
  invite_accepted:          { label: "Client accepts invite",                    desc: "A new client signs up through their invitation link",          icon: "🎉", category: "Milestones" },
  intake_not_submitted:     { label: "Intake form not submitted",                desc: "A client has not submitted their intake form after 24 hours",  icon: "📝", category: "Overdue Actions" },
  agreement_not_signed:     { label: "Agreement not signed",                     desc: "A client has not signed their agreement after 24 hours",       icon: "✍️", category: "Overdue Actions" },
  task_overdue:             { label: "Task overdue",                             desc: "A client has an overdue task for more than 48 hours",          icon: "⏰", category: "Overdue Actions" },
  client_inactive_3d:       { label: "Client inactive 3 days",                  desc: "A client has been inactive for 3 days",                        icon: "💤", category: "Client Inactivity" },
  client_inactive_7d:       { label: "Client inactive 7 days",                  desc: "A client has been inactive for 7 days",                        icon: "😴", category: "Client Inactivity" },
  client_inactive_14d:      { label: "Client inactive 14 days",                 desc: "A client has been inactive for 14 days",                       icon: "🚨", category: "Client Inactivity" },
  weekly_checkin:           { label: "Progress update not submitted",            desc: "A client misses their weekly progress update",                 icon: "📊", category: "Overdue Actions" },
  milestone_completed:      { label: "Milestone completed",                     desc: "A client completes a milestone in their program",              icon: "🏆", category: "Milestones" },
  all_steps_completed:      { label: "All onboarding steps completed",          desc: "A client completes every step in their onboarding flow",       icon: "✅", category: "Milestones" },
  client_added_to_program:  { label: "Client added to program",                 desc: "A client is enrolled in an onboarding program",                icon: "📋", category: "Milestones" },
};

const TRIGGER_GROUPS = [
  {
    label: "Client Inactivity",
    triggers: ["client_inactive_3d", "client_inactive_7d", "client_inactive_14d"],
  },
  {
    label: "Overdue Actions",
    triggers: ["intake_not_submitted", "agreement_not_signed", "task_overdue", "weekly_checkin"],
  },
  {
    label: "Milestones",
    triggers: ["invite_accepted", "milestone_completed", "all_steps_completed", "client_added_to_program"],
  },
];

const inp: React.CSSProperties = {
  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export default function AutomationsSection() {
  const [rules, setRules]           = useState<Rule[]>([]);
  const [loading, setLoading]       = useState(true);
  const [seeding, setSeeding]       = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"rules" | "log">("rules");
  const [logs, setLogs]             = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Add form
  const [showAdd, setShowAdd]           = useState(false);
  const [addTrigger, setAddTrigger]     = useState("");
  const [addMessage, setAddMessage]     = useState("");
  const [addSaving, setAddSaving]       = useState(false);

  // Edit message
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editMsg, setEditMsg]         = useState("");
  const [editSaving, setEditSaving]   = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/automations");
    const d = await res.json();
    setRules(d.rules ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function fetchLogs() {
    setLogsLoading(true);
    const res = await fetch("/api/automations/logs");
    const d = await res.json();
    setLogs(d.logs ?? []);
    setLogsLoading(false);
  }

  async function seedDefaults() {
    setSeeding(true);
    await Promise.all(
      DEFAULT_AUTOMATIONS.map(a =>
        fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a) })
      )
    );
    setSeeding(false);
    fetchRules();
  }

  async function toggleRule(rule: Rule) {
    setTogglingId(rule.id);
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: !r.active } : r));
    const res = await fetch(`/api/automations/${rule.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    if (!res.ok) setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: rule.active } : r));
    setTogglingId(null);
  }

  async function saveEdit(ruleId: string) {
    setEditSaving(true);
    await fetch(`/api/automations/${ruleId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageTemplate: editMsg }),
    });
    setEditSaving(false);
    setEditingId(null);
    fetchRules();
  }

  async function deleteRule(ruleId: string) {
    await fetch(`/api/automations/${ruleId}`, { method: "DELETE" });
    fetchRules();
  }

  async function addAutomation() {
    if (!addTrigger || !addMessage.trim()) return;
    setAddSaving(true);
    await fetch("/api/automations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerType: addTrigger, messageTemplate: addMessage, channel: "email" }),
    });
    setAddSaving(false);
    setAddTrigger(""); setAddMessage(""); setShowAdd(false);
    fetchRules();
  }

  const meta = (type: string) => TRIGGER_META[type] ?? { label: type, desc: type, icon: "⚡", category: "Other" };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", margin: 0, marginBottom: 4 }}>Automated Reminders</h1>
            <p style={{ color: "#606060", fontSize: 13, margin: 0 }}>
              Set up rules that automatically contact clients when they go quiet or fall behind.
            </p>
          </div>
          <button onClick={() => { setShowAdd(true); setAddTrigger(""); setAddMessage(""); }} style={{
            background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
            padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
          }}>+ Add Automation</button>
        </div>

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: rules.some(r => r.active) ? "#C8F04A" : "#606060" }} />
          <span style={{ fontSize: 12, color: "#606060" }}>
            {rules.some(r => r.active)
              ? `${rules.filter(r => r.active).length} automation${rules.filter(r => r.active).length !== 1 ? "s" : ""} active`
              : "No active automations"
            }
          </span>
        </div>

        {/* Explainer */}
        <div style={{
          background: "rgba(200,240,74,0.03)", border: "1px solid rgba(200,240,74,0.1)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 4,
        }}>
          <div style={{ fontSize: 12, color: "#A0A0A0", lineHeight: 1.6 }}>
            <strong style={{ color: "#C8F04A" }}>How automations work:</strong> ClientFlow checks your client activity regularly. When a trigger condition is met, the message is automatically sent to the client via email. You can pause any automation at any time.
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #2A2A2A" }}>
        {(["rules", "log"] as const).map(v => (
          <button key={v} onClick={() => { setActiveView(v); if (v === "log") fetchLogs(); }} style={{
            padding: "10px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            background: "transparent", textTransform: "capitalize",
            color: activeView === v ? "#C8F04A" : "#606060",
            borderBottom: activeView === v ? "2px solid #C8F04A" : "2px solid transparent",
            marginBottom: -1, transition: "all 0.15s",
          }}>{v === "rules" ? "Automations" : "Activity Log"}</button>
        ))}
      </div>

      {/* ══ RULES VIEW ══ */}
      {activeView === "rules" && (
        <div>
          {/* Add form */}
          {showAdd && (
            <div style={{ background: "#161616", border: "1px solid #C8F04A40", borderRadius: 14, padding: 24, marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 16 }}>New Automation</div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>When this happens:</label>
                <select value={addTrigger} onChange={e => setAddTrigger(e.target.value)} style={inp}>
                  <option value="">Select a trigger...</option>
                  {TRIGGER_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.triggers.map(t => (
                        <option key={t} value={t}>{TRIGGER_META[t]?.icon} {TRIGGER_META[t]?.label ?? t}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {addTrigger && (
                  <div style={{ fontSize: 12, color: "#606060", marginTop: 6 }}>
                    {meta(addTrigger).icon} {meta(addTrigger).desc}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Send this message:</label>
                <textarea value={addMessage} onChange={e => setAddMessage(e.target.value)} rows={3} placeholder="Type the email message your client will receive..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#606060" }}>Sent to: <strong style={{ color: "#A0A0A0" }}>Client</strong></span>
                <span style={{ color: "#2A2A2A" }}>·</span>
                <span style={{ fontSize: 12, color: "#606060" }}>Via: <strong style={{ color: "#A0A0A0" }}>Email</strong></span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={addAutomation} disabled={addSaving || !addTrigger || !addMessage.trim()} style={{
                  background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                  padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  opacity: addSaving || !addTrigger || !addMessage.trim() ? 0.5 : 1,
                }}>{addSaving ? "Saving..." : "Create Automation"}</button>
                <button onClick={() => setShowAdd(false)} style={{
                  background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                  padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ color: "#606060", padding: "32px 0" }}>Loading automations...</div>
          ) : rules.length === 0 ? (
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>No automations yet</div>
              <div style={{ color: "#A0A0A0", marginBottom: 24 }}>Set up default reminders to keep your clients on track.</div>
              <button onClick={seedDefaults} disabled={seeding} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer",
                opacity: seeding ? 0.7 : 1,
              }}>{seeding ? "Setting up..." : "Initialize Default Automations"}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {rules.map(rule => {
                const m = meta(rule.triggerType);
                const isEditing = editingId === rule.id;
                return (
                  <div key={rule.id} style={{
                    background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14,
                    overflow: "hidden", opacity: rule.active ? 1 : 0.6, transition: "opacity 0.2s",
                  }}>
                    {/* Trigger section */}
                    <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #1E1E1E" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#505050", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                        When this happens
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 22 }}>{m.icon}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "#F0F0F0" }}>{m.label}</div>
                          <div style={{ fontSize: 12, color: "#606060", marginTop: 1 }}>{m.desc}</div>
                        </div>
                      </div>
                    </div>

                    {/* Message section */}
                    <div style={{ padding: "14px 22px 16px", borderBottom: "1px solid #1E1E1E" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "#505050", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                        Send this message
                      </div>

                      {isEditing ? (
                        <div>
                          <textarea value={editMsg} onChange={e => setEditMsg(e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5, marginBottom: 10 }} />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => saveEdit(rule.id)} disabled={editSaving} style={{
                              background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                              padding: "6px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12,
                              opacity: editSaving ? 0.7 : 1,
                            }}>{editSaving ? "Saving..." : "Save"}</button>
                            <button onClick={() => setEditingId(null)} style={{
                              background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                              padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                            }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{
                            background: "#1A1A1A", borderRadius: 8, padding: "12px 14px",
                            fontSize: 13, color: "#A0A0A0", lineHeight: 1.6, marginBottom: 10,
                            border: "1px solid #222",
                          }}>
                            {rule.messageTemplate}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 11, color: "#505050" }}>Sent to: <strong style={{ color: "#606060" }}>Client</strong></span>
                            <span style={{ color: "#1E1E1E" }}>·</span>
                            <span style={{ fontSize: 11, color: "#505050" }}>Via: <strong style={{ color: "#606060" }}>Email</strong></span>
                            <button onClick={() => { setEditingId(rule.id); setEditMsg(rule.messageTemplate); }} style={{
                              background: "transparent", border: "1px solid #2A2A2A", color: "#606060",
                              padding: "3px 10px", borderRadius: 5, cursor: "pointer", fontSize: 11, marginLeft: "auto",
                            }}>Edit Message</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom: toggle + delete */}
                    <div style={{ padding: "12px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          onClick={() => togglingId !== rule.id && toggleRule(rule)}
                          disabled={togglingId === rule.id}
                          style={{
                            width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer",
                            background: rule.active ? "#C8F04A" : "#2A2A2A",
                            position: "relative", transition: "background 0.2s", flexShrink: 0,
                          }}
                        >
                          <div style={{
                            position: "absolute", top: 4, width: 16, height: 16, borderRadius: "50%",
                            background: rule.active ? "#0F0F0F" : "#606060",
                            left: rule.active ? 24 : 4, transition: "left 0.2s",
                          }} />
                        </button>
                        <span style={{ fontSize: 12, color: rule.active ? "#C8F04A" : "#606060", fontWeight: 500 }}>
                          {rule.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <button onClick={() => deleteRule(rule.id)} style={{
                        background: "transparent", border: "none", color: "#3A3A3A",
                        padding: "4px 8px", cursor: "pointer", fontSize: 12,
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = "#FF6B6B"}
                        onMouseLeave={e => e.currentTarget.style.color = "#3A3A3A"}
                      >Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ ACTIVITY LOG VIEW ══ */}
      {activeView === "log" && (
        <div>
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 16 }}>Activity Log</div>

            {logsLoading ? (
              <div style={{ color: "#606060", fontSize: 13, padding: "24px 0", textAlign: "center" }}>Loading logs...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 500, color: "#F0F0F0", marginBottom: 6 }}>No automation emails sent yet</div>
                <div style={{ color: "#606060", fontSize: 13, lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>
                  The cron job runs every hour. When a trigger condition is met, emails are sent automatically and logged here.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {logs.map(log => {
                  const m = meta(log.ruleType.replace(/_task_.*/, "").replace(/_milestone_.*/, ""));
                  const sentDate = new Date(log.sentAt);
                  return (
                    <div key={log.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      borderRadius: 8, background: "#1A1A1A",
                    }}>
                      <span style={{ fontSize: 16 }}>{m.icon || "📧"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#F0F0F0" }}>
                          <span style={{ fontWeight: 500 }}>{log.client.firstName} {log.client.lastName}</span>
                          <span style={{ color: "#606060" }}> — {m.label || log.ruleType.replace(/_/g, " ")}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#505050", marginTop: 2 }}>
                          {sentDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {sentDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          <span style={{ marginLeft: 8, color: "#606060" }}>{log.client.email}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: "rgba(200,240,74,0.1)", color: "#C8F04A" }}>Sent</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
