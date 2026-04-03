"use client";
import { useState, useEffect, useCallback } from "react";
import { STEP_TYPES } from "@/lib/constants";

type Step = { id: string; type: string; title: string; description: string | null; position: number };
type Program = {
  id: string; name: string; description: string | null; duration: string | null; createdAt: string;
  steps?: Step[];
  _count?: { clients: number };
};

const STEP_ICON: Record<string, string> = {
  intake_form: "📝", agreement: "✍️", task: "✅", milestone: "🏆", checkin: "📊", resource: "📁",
};

const inp: React.CSSProperties = {
  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export default function ProgramsSection() {
  const [programs, setPrograms]             = useState<Program[]>([]);
  const [loading, setLoading]               = useState(true);
  const [selected, setSelected]             = useState<Program | null>(null);
  const [showCreate, setShowCreate]         = useState(false);
  const [formName, setFormName]             = useState("");
  const [formDesc, setFormDesc]             = useState("");
  const [formDuration, setFormDuration]     = useState("");
  const [formError, setFormError]           = useState("");
  const [formSaving, setFormSaving]         = useState(false);
  const [showStepForm, setShowStepForm]     = useState(false);
  const [stepType, setStepType]             = useState("task");
  const [stepTitle, setStepTitle]           = useState("");
  const [stepDesc, setStepDesc]             = useState("");
  const [stepSaving, setStepSaving]         = useState(false);
  const [detailLoading, setDetailLoading]   = useState(false);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/programs");
    const d = await res.json();
    setPrograms(d.programs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  async function loadDetail(p: Program) {
    setSelected(p);
    setDetailLoading(true);
    const res = await fetch(`/api/programs/${p.id}`);
    const d = await res.json();
    setSelected(d.program);
    setDetailLoading(false);
  }

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!formName.trim()) { setFormError("Name is required."); return; }
    setFormSaving(true);
    const res = await fetch("/api/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, description: formDesc, duration: formDuration }),
    });
    setFormSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Error"); return; }
    setFormName(""); setFormDesc(""); setFormDuration(""); setShowCreate(false);
    fetchPrograms();
  }

  async function deleteProgram(id: string) {
    if (!confirm("Delete this program?")) return;
    await fetch(`/api/programs/${id}`, { method: "DELETE" });
    if (selected?.id === id) setSelected(null);
    fetchPrograms();
  }

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !stepTitle.trim()) return;
    setStepSaving(true);
    const res = await fetch(`/api/programs/${selected.id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: stepType, title: stepTitle, description: stepDesc }),
    });
    setStepSaving(false);
    if (res.ok) {
      setStepTitle(""); setStepDesc(""); setShowStepForm(false);
      loadDetail(selected);
    }
  }

  async function deleteStep(stepId: string) {
    if (!selected) return;
    await fetch(`/api/programs/${selected.id}/steps/${stepId}`, { method: "DELETE" });
    loadDetail(selected);
  }

  // ─── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{
          background: "transparent", border: "none", color: "#A0A0A0", cursor: "pointer",
          fontSize: 13, marginBottom: 20, padding: 0, display: "flex", alignItems: "center", gap: 6,
        }}>
          ← Back to Programs
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#F0F0F0", margin: 0, marginBottom: 4 }}>{selected.name}</h1>
            {selected.description && <p style={{ color: "#A0A0A0", margin: 0, fontSize: 14 }}>{selected.description}</p>}
            {selected.duration && (
              <span style={{ display: "inline-block", marginTop: 8, background: "rgba(200,240,74,0.1)", color: "#C8F04A", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>
                {selected.duration}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => deleteProgram(selected.id)} style={{
              background: "transparent", border: "1px solid #2A2A2A", color: "#FF6B6B",
              padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
            }}>Delete</button>
          </div>
        </div>

        {/* Steps */}
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>
              Program Steps {!detailLoading && selected.steps && <span style={{ color: "#606060", fontWeight: 400, fontSize: 13 }}>({selected.steps.length})</span>}
            </div>
            <button onClick={() => setShowStepForm(!showStepForm)} style={{
              background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
            }}>
              + Add Step
            </button>
          </div>

          {showStepForm && (
            <form onSubmit={addStep} style={{ background: "#1A1A1A", borderRadius: 10, padding: 18, marginBottom: 20, border: "1px solid #2A2A2A" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Type</label>
                  <select value={stepType} onChange={e => setStepType(e.target.value)} style={inp}>
                    {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Title *</label>
                  <input value={stepTitle} onChange={e => setStepTitle(e.target.value)} placeholder="Step title" style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Description</label>
                <input value={stepDesc} onChange={e => setStepDesc(e.target.value)} placeholder="Optional description" style={inp} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={stepSaving} style={{
                  background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                  padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  opacity: stepSaving ? 0.7 : 1,
                }}>
                  {stepSaving ? "Saving..." : "Add Step"}
                </button>
                <button type="button" onClick={() => setShowStepForm(false)} style={{
                  background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                  padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
              </div>
            </form>
          )}

          {detailLoading ? (
            <div style={{ color: "#606060", fontSize: 13, padding: "20px 0" }}>Loading steps...</div>
          ) : !selected.steps || selected.steps.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#606060" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div>No steps yet. Add your first step to build out this program.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {selected.steps.map((step, i) => (
                <div key={step.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                  borderRadius: 8, background: i % 2 === 0 ? "#1A1A1A" : "transparent",
                }}>
                  <div style={{ color: "#606060", fontSize: 12, fontWeight: 600, width: 20, textAlign: "center" }}>{step.position}</div>
                  <div style={{ fontSize: 18 }}>{STEP_ICON[step.type] ?? "📌"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0" }}>{step.title}</div>
                    {step.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 1 }}>{step.description}</div>}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                    background: "rgba(200,240,74,0.08)", color: "#C8F04A", textTransform: "uppercase", letterSpacing: "0.06em",
                  }}>
                    {STEP_TYPES.find(t => t.value === step.type)?.label ?? step.type}
                  </span>
                  <button onClick={() => deleteStep(step.id)} style={{
                    background: "transparent", border: "none", color: "#606060", cursor: "pointer",
                    fontSize: 16, padding: "2px 6px", borderRadius: 4,
                  }} title="Remove step">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── List view ────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, color: "#F0F0F0", margin: 0 }}>Programs</h1>
        <button onClick={() => { setShowCreate(true); setFormError(""); }} style={{
          background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
          padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14,
        }}>
          + New Program
        </button>
      </div>

      {showCreate && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, marginBottom: 24, maxWidth: 540 }}>
          <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 15, color: "#F0F0F0" }}>New Program</div>
          <form onSubmit={createProgram}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Program Name *</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. 12-Week Transformation" style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What does this program involve?" rows={3}
                style={{ ...inp, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Duration</label>
              <input value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="e.g. 12 weeks" style={inp} />
            </div>
            {formError && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 14 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={formSaving} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", opacity: formSaving ? 0.7 : 1,
              }}>
                {formSaving ? "Saving..." : "Save Program"}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setFormError(""); }} style={{
                background: "transparent", color: "#A0A0A0", padding: "10px 20px",
                borderRadius: 8, border: "1px solid #2A2A2A", cursor: "pointer", fontSize: 14,
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#606060", padding: "32px 0" }}>Loading programs...</div>
      ) : programs.length === 0 ? (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>No programs yet</div>
          <div style={{ color: "#A0A0A0" }}>Create your first coaching program or onboarding flow.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {programs.map(p => (
            <div key={p.id} onClick={() => loadDetail(p)} style={{
              background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12,
              padding: "18px 24px", cursor: "pointer", transition: "border-color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#3A3A3A")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#2A2A2A")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3, color: "#F0F0F0" }}>{p.name}</div>
                  {p.description && <div style={{ color: "#A0A0A0", fontSize: 13, marginBottom: 6 }}>{p.description}</div>}
                  {p.duration && (
                    <span style={{ background: "rgba(200,240,74,0.1)", color: "#C8F04A", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99 }}>
                      {p.duration}
                    </span>
                  )}
                </div>
                <span style={{ color: "#606060", fontSize: 13 }}>View →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
