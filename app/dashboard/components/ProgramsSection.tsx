"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { STEP_TYPES } from "@/lib/constants";

const DragDropContext = dynamic(() => import("@hello-pangea/dnd").then(m => m.DragDropContext), { ssr: false });
const Droppable = dynamic(() => import("@hello-pangea/dnd").then(m => m.Droppable), { ssr: false });
const Draggable = dynamic(() => import("@hello-pangea/dnd").then(m => m.Draggable), { ssr: false });

type Step = { id: string; type: string; title: string; description: string | null; position: number; fields?: unknown };
type Program = {
  id: string; name: string; description: string | null; duration: string | null; createdAt: string;
  steps?: Step[];
  _count?: { clients: number };
};

const STEP_ICON: Record<string, string> = {
  intake_form: "📝", agreement: "✍️", task: "✅", milestone: "🏆", checkin: "📊", resource: "📁", document: "📎",
};

const STEP_ADD_OPTIONS = [
  { type: "intake_form", label: "Intake Form", desc: "Collect information from client", icon: "📝" },
  { type: "agreement", label: "Agreement", desc: "Client signs/accepts", icon: "✍️" },
  { type: "task", label: "Task", desc: "Client completes an action", icon: "✅" },
  { type: "document", label: "Document Request", desc: "Client uploads a file", icon: "📎" },
  { type: "resource", label: "Resource", desc: "Link or content to review", icon: "📁" },
  { type: "checkin", label: "Progress Update Schedule", desc: "Set up recurring updates", icon: "📊" },
];

const TEMPLATES = ["DFY Ads Management", "DFY Lead Generation", "Insurance Policy Onboarding", "High Ticket Sales Onboarding", "Coaching Program Onboarding", "Marketing Retainer Onboarding", "Consulting Project Onboarding"];

const FIELD_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "file_link", label: "File Upload (Link)" },
];

const inp: React.CSSProperties = {
  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

export default function ProgramsSection() {
  const [programs, setPrograms]           = useState<Program[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<Program | null>(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [formName, setFormName]           = useState("");
  const [formDesc, setFormDesc]           = useState("");
  const [formDuration, setFormDuration]   = useState("");
  const [formError, setFormError]         = useState("");
  const [formSaving, setFormSaving]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Inline step add
  const [addingStepType, setAddingStepType] = useState<string | null>(null);
  const [newStepTitle, setNewStepTitle]     = useState("");
  const [newStepDesc, setNewStepDesc]       = useState("");
  const [stepSaving, setStepSaving]         = useState(false);
  const [showAddMenu, setShowAddMenu]       = useState(false);

  // Inline step edit
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle]         = useState("");
  const [editDesc, setEditDesc]           = useState("");
  const [editFields, setEditFields]       = useState<Array<{label: string; type: string; required: boolean; options?: string}>>([]);
  const [editAgreement, setEditAgreement] = useState("");
  const [editResourceUrl, setEditResourceUrl] = useState("");

  // Program settings edit
  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsName, setSettingsName]       = useState("");
  const [settingsDesc, setSettingsDesc]       = useState("");
  const [settingsDur, setSettingsDur]         = useState("");
  const [settingsSaving, setSettingsSaving]   = useState(false);

  // Client progress
  const [showClients, setShowClients]   = useState(false);
  const [progClients, setProgClients]   = useState<{ id: string; firstName: string; lastName: string; status: string }[]>([]);

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
    setEditingSettings(false);
    setShowClients(false);
    setAddingStepType(null);
    setEditingStepId(null);
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formName, description: formDesc, duration: formDuration }),
    });
    setFormSaving(false);
    if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Error"); return; }
    const d = await res.json();
    setFormName(""); setFormDesc(""); setFormDuration(""); setShowCreate(false);
    fetchPrograms();
    loadDetail(d.program);
  }

  async function deleteProgram(id: string) {
    await fetch(`/api/programs/${id}`, { method: "DELETE" });
    setSelected(null);
    fetchPrograms();
  }

  async function duplicateProgram(id: string) {
    const res = await fetch(`/api/programs/${id}/duplicate`, { method: "POST" });
    if (res.ok) fetchPrograms();
  }

  async function saveSettings() {
    if (!selected) return;
    setSettingsSaving(true);
    await fetch(`/api/programs/${selected.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: settingsName, description: settingsDesc, duration: settingsDur }),
    });
    setSettingsSaving(false);
    setEditingSettings(false);
    loadDetail(selected);
    fetchPrograms();
  }

  async function addStep() {
    if (!selected || !addingStepType || !newStepTitle.trim()) return;
    setStepSaving(true);
    // Map 'document' to 'task' for DB since ProgramStep doesn't have a document type in STEP_TYPES
    const dbType = STEP_TYPES.some(t => t.value === addingStepType) ? addingStepType : "task";
    await fetch(`/api/programs/${selected.id}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: dbType, title: newStepTitle, description: newStepDesc }),
    });
    setStepSaving(false);
    setAddingStepType(null);
    setNewStepTitle("");
    setNewStepDesc("");
    loadDetail(selected);
    fetchPrograms();
  }

  async function deleteStep(stepId: string) {
    if (!selected) return;
    await fetch(`/api/programs/${selected.id}/steps/${stepId}`, { method: "DELETE" });
    loadDetail(selected);
    fetchPrograms();
  }

  async function saveStepEdit(stepId: string) {
    if (!selected) return;
    const step = selected.steps?.find(s => s.id === stepId);
    let fields: unknown = undefined;
    if (step?.type === "intake_form") fields = editFields;
    else if (step?.type === "agreement") fields = { content: editAgreement };
    else if (step?.type === "resource") fields = { url: editResourceUrl };

    await fetch(`/api/programs/${selected.id}/steps/${stepId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, description: editDesc, ...(fields !== undefined && { fields }) }),
    });
    setEditingStepId(null);
    loadDetail(selected);
  }

  async function onDragEnd(result: { destination: { index: number } | null; source: { index: number } }) {
    if (!result.destination || !selected?.steps) return;
    const items = Array.from(selected.steps);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    // Optimistic update
    setSelected({ ...selected, steps: items.map((s, i) => ({ ...s, position: i + 1 })) });
    await fetch(`/api/programs/${selected.id}/steps/reorder`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: items.map(s => s.id) }),
    });
  }

  async function loadClients() {
    if (!selected) return;
    setShowClients(true);
    const res = await fetch("/api/clients");
    const d = await res.json();
    setProgClients((d.clients ?? []).filter((c: { program: { id: string } | null }) => c.program?.id === selected.id));
  }

  function startEditSettings() {
    if (!selected) return;
    setSettingsName(selected.name);
    setSettingsDesc(selected.description ?? "");
    setSettingsDur(selected.duration ?? "");
    setEditingSettings(true);
  }

  const clientCount = selected?._count?.clients ?? 0;
  const stepCount = selected?.steps?.length ?? 0;

  // ─── Detail view ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div>
        <button onClick={() => { setSelected(null); fetchPrograms(); }} style={{
          background: "transparent", border: "none", color: "#A0A0A0", cursor: "pointer",
          fontSize: 13, marginBottom: 20, padding: 0,
        }}>← Back to Programs</button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          {/* LEFT — Flow Builder */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 17, color: "#F0F0F0" }}>
                Onboarding Flow
                {!detailLoading && <span style={{ color: "#606060", fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({stepCount} steps)</span>}
              </div>
            </div>

            {detailLoading ? (
              <div style={{ color: "#606060", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Loading flow...</div>
            ) : !selected.steps || selected.steps.length === 0 ? (
              <div style={{
                background: "#161616", border: "1px dashed #2A2A2A", borderRadius: 12,
                padding: "48px 24px", textAlign: "center", marginBottom: 16,
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                <div style={{ fontWeight: 500, color: "#F0F0F0", marginBottom: 4 }}>No steps yet</div>
                <div style={{ color: "#606060", fontSize: 13 }}>Add your first step below to build this onboarding flow.</div>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="steps">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 16 }}>
                      {selected.steps!.map((step, i) => (
                        <Draggable key={step.id} draggableId={step.id} index={i}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef} {...prov.draggableProps}
                              style={{
                                ...prov.draggableProps.style,
                                display: "flex", gap: 0,
                                marginBottom: 0,
                              }}
                            >
                              {/* Timeline line */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40, flexShrink: 0 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: "50%",
                                  background: snap.isDragging ? "#C8F04A" : "#1E1E1E",
                                  border: `2px solid ${snap.isDragging ? "#C8F04A" : "#2A2A2A"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 12, fontWeight: 700,
                                  color: snap.isDragging ? "#0F0F0F" : "#606060",
                                  flexShrink: 0, zIndex: 1,
                                }}>
                                  {i + 1}
                                </div>
                                {i < selected.steps!.length - 1 && (
                                  <div style={{ width: 2, flex: 1, background: "#2A2A2A", minHeight: 16 }} />
                                )}
                              </div>

                              {/* Step card */}
                              <div style={{
                                flex: 1, background: snap.isDragging ? "#1E1E1E" : "#161616",
                                border: `1px solid ${snap.isDragging ? "#3A3A3A" : "#2A2A2A"}`,
                                borderRadius: 10, padding: "14px 16px", marginBottom: 8, marginLeft: 8,
                                boxShadow: snap.isDragging ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
                              }}>
                                {editingStepId === step.id ? (
                                  <div>
                                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inp, marginBottom: 8, fontSize: 13 }} autoFocus />
                                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description (optional)" style={{ ...inp, marginBottom: 10, fontSize: 13 }} />

                                    {/* intake_form field editor */}
                                    {step.type === "intake_form" && (
                                      <div style={{ marginBottom: 10 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#A0A0A0", marginBottom: 8 }}>Form Fields</div>
                                        {editFields.map((field, fi) => (
                                          <div key={fi} style={{
                                            background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 8,
                                            padding: 10, marginBottom: 6,
                                          }}>
                                            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                                              <input
                                                value={field.label}
                                                onChange={e => {
                                                  const next = [...editFields];
                                                  next[fi] = { ...next[fi], label: e.target.value };
                                                  setEditFields(next);
                                                }}
                                                placeholder="Field label"
                                                style={{ ...inp, flex: 1, fontSize: 12, padding: "6px 10px" }}
                                              />
                                              <select
                                                value={field.type}
                                                onChange={e => {
                                                  const next = [...editFields];
                                                  next[fi] = { ...next[fi], type: e.target.value };
                                                  setEditFields(next);
                                                }}
                                                style={{ ...inp, width: 140, fontSize: 12, padding: "6px 10px", cursor: "pointer" }}
                                              >
                                                {FIELD_TYPES.map(ft => (
                                                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                ))}
                                              </select>
                                            </div>
                                            {(field.type === "dropdown" || field.type === "multiple_choice") && (
                                              <input
                                                value={field.options ?? ""}
                                                onChange={e => {
                                                  const next = [...editFields];
                                                  next[fi] = { ...next[fi], options: e.target.value };
                                                  setEditFields(next);
                                                }}
                                                placeholder="Options (comma-separated)"
                                                style={{ ...inp, fontSize: 12, padding: "6px 10px", marginBottom: 6 }}
                                              />
                                            )}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#A0A0A0", cursor: "pointer" }}>
                                                <input
                                                  type="checkbox"
                                                  checked={field.required}
                                                  onChange={e => {
                                                    const next = [...editFields];
                                                    next[fi] = { ...next[fi], required: e.target.checked };
                                                    setEditFields(next);
                                                  }}
                                                  style={{ accentColor: "#C8F04A" }}
                                                />
                                                Required
                                              </label>
                                              <button
                                                onClick={() => setEditFields(editFields.filter((_, idx) => idx !== fi))}
                                                style={{
                                                  background: "transparent", border: "none", color: "#FF6B6B",
                                                  cursor: "pointer", fontSize: 11, padding: "2px 6px",
                                                }}
                                              >Delete</button>
                                            </div>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => setEditFields([...editFields, { label: "", type: "short_text", required: false }])}
                                          style={{
                                            width: "100%", padding: "7px 0", borderRadius: 6,
                                            background: "transparent", border: "1px dashed #2A2A2A",
                                            color: "#606060", fontSize: 12, cursor: "pointer",
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F04A"; e.currentTarget.style.color = "#C8F04A"; }}
                                          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#606060"; }}
                                        >+ Add Field</button>
                                      </div>
                                    )}

                                    {/* agreement content editor */}
                                    {step.type === "agreement" && (
                                      <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Agreement Content</label>
                                        <textarea
                                          value={editAgreement}
                                          onChange={e => setEditAgreement(e.target.value)}
                                          placeholder="Enter the agreement text that clients will review and accept..."
                                          rows={6}
                                          style={{ ...inp, fontSize: 13, resize: "vertical" }}
                                        />
                                      </div>
                                    )}

                                    {/* resource URL editor */}
                                    {step.type === "resource" && (
                                      <div style={{ marginBottom: 10 }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Resource URL</label>
                                        <input
                                          value={editResourceUrl}
                                          onChange={e => setEditResourceUrl(e.target.value)}
                                          placeholder="https://..."
                                          style={{ ...inp, fontSize: 13 }}
                                        />
                                      </div>
                                    )}

                                    <div style={{ display: "flex", gap: 6 }}>
                                      <button onClick={() => saveStepEdit(step.id)} style={{ background: "#C8F04A", color: "#0F0F0F", fontWeight: 600, padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12 }}>Save</button>
                                      <button onClick={() => setEditingStepId(null)} style={{ background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                    {/* Drag handle */}
                                    <div {...prov.dragHandleProps} style={{ cursor: "grab", color: "#3A3A3A", fontSize: 16, lineHeight: 1, paddingTop: 2, userSelect: "none" }} title="Drag to reorder">⠿</div>

                                    <div style={{ fontSize: 20, flexShrink: 0, paddingTop: 1 }}>{STEP_ICON[step.type] ?? "📌"}</div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 14, fontWeight: 500, color: "#F0F0F0" }}>{step.title}</div>
                                      {step.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 2 }}>{step.description}</div>}
                                      <div style={{ marginTop: 6 }}>
                                        <span style={{
                                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                                          background: "rgba(200,240,74,0.06)", color: "#C8F04A",
                                          textTransform: "uppercase", letterSpacing: "0.04em",
                                        }}>
                                          {STEP_TYPES.find(t => t.value === step.type)?.label ?? step.type}
                                        </span>
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                      <button onClick={() => {
                                        setEditingStepId(step.id);
                                        setEditTitle(step.title);
                                        setEditDesc(step.description ?? "");
                                        const sf = step.fields as Record<string, unknown> | unknown[] | null | undefined;
                                        if (step.type === "intake_form") {
                                          setEditFields(Array.isArray(sf) ? (sf as Array<{label: string; type: string; required: boolean; options?: string}>) : []);
                                        } else if (step.type === "agreement") {
                                          setEditAgreement((sf && !Array.isArray(sf) && typeof sf === "object" ? (sf as Record<string, unknown>).content : "") as string ?? "");
                                        } else if (step.type === "resource") {
                                          setEditResourceUrl((sf && !Array.isArray(sf) && typeof sf === "object" ? (sf as Record<string, unknown>).url : "") as string ?? "");
                                        }
                                      }} style={{
                                        background: "transparent", border: "1px solid #2A2A2A", color: "#606060",
                                        padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11,
                                      }}>Edit</button>
                                      <button onClick={() => deleteStep(step.id)} style={{
                                        background: "transparent", border: "1px solid #2A2A2A", color: "#FF6B6B",
                                        padding: "4px 8px", borderRadius: 5, cursor: "pointer", fontSize: 11,
                                      }}>×</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}

            {/* Add Step inline form */}
            {addingStepType ? (
              <div style={{ background: "#161616", border: "1px solid #C8F04A", borderRadius: 10, padding: 18, marginTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>{STEP_ADD_OPTIONS.find(o => o.type === addingStepType)?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#C8F04A" }}>{STEP_ADD_OPTIONS.find(o => o.type === addingStepType)?.label}</span>
                </div>
                <input value={newStepTitle} onChange={e => setNewStepTitle(e.target.value)} placeholder="Step title *" autoFocus style={{ ...inp, marginBottom: 8 }}
                  onKeyDown={e => { if (e.key === "Enter") addStep(); }}
                />
                <input value={newStepDesc} onChange={e => setNewStepDesc(e.target.value)} placeholder="Description (optional)" style={{ ...inp, marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={addStep} disabled={stepSaving || !newStepTitle.trim()} style={{
                    background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                    opacity: stepSaving ? 0.7 : 1,
                  }}>{stepSaving ? "Adding..." : "Add Step"}</button>
                  <button onClick={() => { setAddingStepType(null); setNewStepTitle(""); setNewStepDesc(""); }} style={{
                    background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowAddMenu(!showAddMenu)} style={{
                  width: "100%", padding: "12px 0", borderRadius: 10,
                  background: "transparent", border: "1px dashed #2A2A2A",
                  color: "#606060", fontSize: 14, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#C8F04A"; e.currentTarget.style.color = "#C8F04A"; }}
                  onMouseLeave={e => { if (!showAddMenu) { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#606060"; }}}
                >+ Add Step</button>

                {showAddMenu && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, zIndex: 20,
                    background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 12,
                    padding: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}>
                    {STEP_ADD_OPTIONS.map(opt => (
                      <button key={opt.type} onClick={() => { setAddingStepType(opt.type); setShowAddMenu(false); }} style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 12px", borderRadius: 8, border: "none",
                        background: "transparent", cursor: "pointer", textAlign: "left",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "#222"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <span style={{ fontSize: 20 }}>{opt.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0" }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: "#606060" }}>{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT — Program Settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>Program Settings</div>
                {!editingSettings && (
                  <button onClick={startEditSettings} style={{
                    background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                    padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                  }}>Edit</button>
                )}
              </div>

              {editingSettings ? (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#606060", display: "block", marginBottom: 4 }}>Name</label>
                    <input value={settingsName} onChange={e => setSettingsName(e.target.value)} style={{ ...inp, fontSize: 13 }} />
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, color: "#606060", display: "block", marginBottom: 4 }}>Description</label>
                    <textarea value={settingsDesc} onChange={e => setSettingsDesc(e.target.value)} rows={3} style={{ ...inp, fontSize: 13, resize: "vertical" }} />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, color: "#606060", display: "block", marginBottom: 4 }}>Duration</label>
                    <input value={settingsDur} onChange={e => setSettingsDur(e.target.value)} placeholder="e.g. 30 days" style={{ ...inp, fontSize: 13 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={saveSettings} disabled={settingsSaving} style={{
                      background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                      padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12,
                      opacity: settingsSaving ? 0.7 : 1,
                    }}>{settingsSaving ? "Saving..." : "Save"}</button>
                    <button onClick={() => setEditingSettings(false)} style={{
                      background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                      padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                    }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#F0F0F0", marginBottom: 4 }}>{selected.name}</div>
                  {selected.description && <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 10, lineHeight: 1.5 }}>{selected.description}</div>}
                  {selected.duration && (
                    <span style={{ display: "inline-block", background: "rgba(200,240,74,0.08)", color: "#C8F04A", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, marginBottom: 10 }}>
                      {selected.duration}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ color: "#606060", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Clients</div>
                <div style={{ fontSize: 24, fontWeight: 300, color: "#F0F0F0" }}>{clientCount}</div>
              </div>
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ color: "#606060", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Steps</div>
                <div style={{ fontSize: 24, fontWeight: 300, color: "#F0F0F0" }}>{stepCount}</div>
              </div>
            </div>

            {/* Client Progress */}
            {clientCount > 0 && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 18 }}>
                {!showClients ? (
                  <button onClick={loadClients} style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    background: "rgba(200,240,74,0.06)", border: "1px solid rgba(200,240,74,0.15)",
                    color: "#C8F04A", fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>View Client Progress</button>
                ) : (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#F0F0F0", marginBottom: 12 }}>Enrolled Clients</div>
                    {progClients.length === 0 ? (
                      <div style={{ color: "#606060", fontSize: 12 }}>No clients found.</div>
                    ) : progClients.map(c => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1E1E1E" }}>
                        <span style={{ fontSize: 13, color: "#F0F0F0" }}>{c.firstName} {c.lastName}</span>
                        <span style={{ fontSize: 11, color: "#606060", textTransform: "capitalize" }}>{c.status.replace("_", " ")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => duplicateProgram(selected.id)} style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                background: "transparent", border: "1px solid #2A2A2A",
                color: "#A0A0A0", fontSize: 13, cursor: "pointer", fontWeight: 500,
              }}>Duplicate Program</button>
              <button onClick={() => deleteProgram(selected.id)} style={{
                width: "100%", padding: "10px 0", borderRadius: 8,
                background: "transparent", border: "1px solid rgba(255,107,107,0.2)",
                color: "#FF6B6B", fontSize: 13, cursor: "pointer", fontWeight: 500,
              }}>Delete Program</button>
            </div>
          </div>
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
        }}>+ New Program</button>
      </div>

      {showCreate && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24, marginBottom: 24, maxWidth: 540 }}>
          <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 15, color: "#F0F0F0" }}>New Program</div>
          <form onSubmit={createProgram}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Program Name *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {TEMPLATES.map(t => (
                  <button type="button" key={t} onClick={() => setFormName(t)} style={{
                    padding: "5px 12px", borderRadius: 99, border: "1px solid",
                    borderColor: formName === t ? "#C8F04A" : "#2A2A2A",
                    background: formName === t ? "rgba(200,240,74,0.08)" : "transparent",
                    color: formName === t ? "#C8F04A" : "#A0A0A0",
                    fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                  }}>{t}</button>
                ))}
              </div>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Or type a custom program name..." style={inp} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Description</label>
              <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="What does this program involve?" rows={3} style={{ ...inp, resize: "vertical" }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Duration</label>
              <input value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="e.g. 30 days" style={inp} />
            </div>
            {formError && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 14 }}>{formError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={formSaving} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", opacity: formSaving ? 0.7 : 1,
              }}>{formSaving ? "Saving..." : "Create Program"}</button>
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
          <div style={{ color: "#A0A0A0" }}>Create your first onboarding flow.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {programs.map(p => {
            const pSteps = p.steps?.length ?? 0;
            const pClients = p._count?.clients ?? 0;
            return (
              <div key={p.id} style={{
                background: "#161616", border: "1px solid #2A2A2A", borderRadius: 14,
                padding: 24, cursor: "pointer", transition: "border-color 0.15s",
              }}
                onClick={() => loadDetail(p)}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#3A3A3A"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#2A2A2A"}
              >
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, color: "#F0F0F0" }}>{p.name}</div>
                {p.description && <div style={{ color: "#606060", fontSize: 13, marginBottom: 12, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>}

                <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 300, color: "#F0F0F0" }}>{pSteps}</div>
                    <div style={{ fontSize: 10, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em" }}>Steps</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 300, color: "#F0F0F0" }}>{pClients}</div>
                    <div style={{ fontSize: 10, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em" }}>Clients</div>
                  </div>
                  {p.duration && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#C8F04A" }}>{p.duration}</div>
                      <div style={{ fontSize: 10, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</div>
                    </div>
                  )}
                </div>

                {/* Step type preview */}
                {pSteps > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {p.steps!.slice(0, 6).map(s => (
                      <span key={s.id} style={{ fontSize: 14 }} title={s.title}>{STEP_ICON[s.type] ?? "📌"}</span>
                    ))}
                    {pSteps > 6 && <span style={{ fontSize: 11, color: "#606060", alignSelf: "center" }}>+{pSteps - 6}</span>}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid #1E1E1E" }}>
                  <div style={{ fontSize: 11, color: "#505050" }}>
                    {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => loadDetail(p)} style={{
                      background: "rgba(200,240,74,0.06)", border: "1px solid rgba(200,240,74,0.15)",
                      color: "#C8F04A", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600,
                    }}>Edit Flow</button>
                    <button onClick={() => duplicateProgram(p.id)} style={{
                      background: "transparent", border: "1px solid #2A2A2A",
                      color: "#606060", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                    }}>Duplicate</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
