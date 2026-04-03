"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useIsMobile } from "@/lib/useIsMobile";
import { CLIENT_STATUS, type ClientStatus } from "@/lib/constants";

const KanbanBoard = dynamic(() => import("./KanbanBoard"), { ssr: false });

type Program = { id: string; name: string; steps?: Step[] };
type Step = { id: string; type: string; title: string; description: string | null; position: number; fields?: unknown };
type DocReq = { id: string; title: string; description: string | null; required: boolean; status: string; fileUrl: string | null; fileName: string | null; requestedAt: string; uploadedAt: string | null };
type Task = { id: string; title: string; description: string | null; status: string; dueDate: string | null; completedAt: string | null };
type StepCompletion = { id: string; stepId: string; clientId?: string; data: unknown; completedAt: string; step: Step };
type FormSubmission = { id: string; answers: { value: string }[]; submittedAt: string };
type AgreementAcceptance = { id: string; fullName: string; acceptedAt: string; stepId?: string };
type CheckInSubmission = { id: string; answers: string; submittedAt: string; stepId?: string };
type Note = { id: string; content: string; createdAt: string };
type Client = {
  id: string; firstName: string; lastName: string; email: string; phone: string | null;
  companyName: string | null; assignedTo: string | null;
  status: string; invitedAt: string | null; lastActivityAt: string | null; createdAt: string;
  program: Program | null;
  tasks?: Task[];
  stepCompletions?: StepCompletion[];
  formSubmissions?: FormSubmission[];
  agreementAcceptances?: AgreementAcceptance[];
  checkInSubmissions?: CheckInSubmission[];
  documentRequests?: DocReq[];
};

const inp: React.CSSProperties = {
  width: "100%", background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#F0F0F0",
  borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
};

const actionBtn: React.CSSProperties = {
  background: "#1A1A1A", border: "1px solid #2A2A2A", color: "#A0A0A0",
  padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
  transition: "all 0.15s",
};

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseCheckInAnswers(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

function confidenceColor(val: number): string {
  if (val <= 3) return "#FF6B6B";
  if (val <= 6) return "#F0A94A";
  return "#C8F04A";
}

const stepTypeIcons: Record<string, string> = {
  intake_form: "📋",
  agreement: "📝",
  task: "✅",
  checkin: "📊",
  resource: "📚",
  milestone: "🏆",
  document: "📄",
};

export default function ClientsSection() {
  const isMobile = useIsMobile();
  const [clients, setClients]           = useState<Client[]>([]);
  const [programs, setPrograms]         = useState<Program[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Client | null>(null);
  const [showInvite, setShowInvite]     = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [viewMode, setViewMode]       = useState<"list" | "board">("list");

  // Search and filters
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  // Invite form
  const [iFirst, setIFirst]     = useState("");
  const [iLast, setILast]       = useState("");
  const [iEmail, setIEmail]     = useState("");
  const [iPhone, setIPhone]     = useState("");
  const [iCompany, setICompany] = useState("");
  const [iAssign, setIAssign]   = useState("");
  const [iProg, setIProg]       = useState("");
  const [iNewProg, setINewProg] = useState("");
  const [iError, setIError]     = useState("");
  const [iSaving, setISaving]   = useState(false);

  // Task form
  const [tTitle, setTTitle]       = useState("");
  const [tDesc, setTDesc]         = useState("");
  const [tDue, setTDue]           = useState("");
  const [tSaving, setTSaving]     = useState(false);

  // Detail tabs & documents
  const [detailTab, setDetailTab]     = useState<"overview" | "journey" | "tasks" | "documents" | "updates" | "notes">("overview");
  const [docs, setDocs]               = useState<DocReq[]>([]);
  const [showDocForm, setShowDocForm] = useState(false);
  const [docTitle, setDocTitle]       = useState("");
  const [docDesc, setDocDesc]         = useState("");
  const [docReq, setDocReq]           = useState(true);
  const [docSaving, setDocSaving]     = useState(false);

  // Status update
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Notes
  const [notes, setNotes]             = useState<Note[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving]   = useState(false);

  // Edit client
  const [showEdit, setShowEdit]     = useState(false);
  const [editFirst, setEditFirst]   = useState("");
  const [editLast, setEditLast]     = useState("");
  const [editEmail, setEditEmail]   = useState("");
  const [editPhone, setEditPhone]   = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editAssign, setEditAssign] = useState("");
  const [editProg, setEditProg]     = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const [cr, pr] = await Promise.all([fetch("/api/clients"), fetch("/api/programs")]);
    const [cd, pd] = await Promise.all([cr.json(), pr.json()]);
    setClients(cd.clients ?? []);
    setPrograms(pd.programs ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Filtered clients
  const filteredClients = clients.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      const match = `${c.firstName} ${c.lastName} ${c.email} ${c.companyName ?? ""}`.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (programFilter !== "all" && c.program?.id !== programFilter) return false;
    return true;
  });

  async function loadClientDetail(c: Client) {
    const res = await fetch(`/api/clients/${c.id}`);
    const d = await res.json();
    setSelected(d.client);
    setDetailTab("overview");
    fetchDocs(c.id);
  }

  async function inviteClient(e: React.FormEvent) {
    e.preventDefault();
    setIError("");
    setISaving(true);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: iFirst, lastName: iLast, email: iEmail, phone: iPhone, companyName: iCompany, assignedTo: iAssign, programId: iProg || null, newProgramName: !iProg ? iNewProg : null }),
    });
    setISaving(false);
    if (!res.ok) { const d = await res.json(); setIError(d.error ?? "Error"); return; }
    setIFirst(""); setILast(""); setIEmail(""); setIPhone(""); setICompany(""); setIAssign(""); setIProg(""); setINewProg("");
    setShowInvite(false);
    fetchClients();
  }

  async function deleteClient(clientId: string) {
    await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (selected?.id === clientId) setSelected(null);
    fetchClients();
  }

  async function updateStatus(clientId: string, status: string) {
    setUpdatingId(clientId);
    await fetch(`/api/clients/${clientId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    fetchClients();
    if (selected?.id === clientId) setSelected(prev => prev ? { ...prev, status } : prev);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !tTitle.trim()) return;
    setTSaving(true);
    await fetch("/api/tasks", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selected.id, title: tTitle, description: tDesc, dueDate: tDue || null }),
    });
    setTSaving(false);
    setTTitle(""); setTDesc(""); setTDue(""); setShowTaskForm(false);
    loadClientDetail(selected);
  }

  async function completeTask(taskId: string) {
    if (!selected) return;
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "complete" }),
    });
    loadClientDetail(selected);
  }

  // ─── Documents ──────────────────────────────────────────────────────────────
  async function fetchDocs(clientId: string) {
    const res = await fetch(`/api/document-requests?clientId=${clientId}`);
    const d = await res.json();
    setDocs(d.documents ?? []);
  }

  async function createDocRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !docTitle.trim()) return;
    setDocSaving(true);
    await fetch("/api/document-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: selected.id, title: docTitle, description: docDesc, required: docReq }),
    });
    setDocSaving(false);
    setDocTitle(""); setDocDesc(""); setDocReq(true); setShowDocForm(false);
    fetchDocs(selected.id);
  }

  async function approveDoc(docId: string) {
    await fetch(`/api/document-requests/${docId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    if (selected) fetchDocs(selected.id);
  }

  // ─── Notes ──────────────────────────────────────────────────────────────────
  async function fetchNotes(clientId: string) {
    const res = await fetch(`/api/clients/${clientId}/notes`);
    const d = await res.json();
    setNotes(d.notes ?? []);
  }

  async function addNote() {
    if (!selected || !noteContent.trim()) return;
    setNoteSaving(true);
    await fetch(`/api/clients/${selected.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: noteContent }),
    });
    setNoteSaving(false);
    setNoteContent("");
    setShowNoteForm(false);
    fetchNotes(selected.id);
  }

  // ─── Edit client ───────────────────────────────────────────────────────────
  function openEdit() {
    if (!selected) return;
    setEditFirst(selected.firstName);
    setEditLast(selected.lastName);
    setEditEmail(selected.email);
    setEditPhone(selected.phone ?? "");
    setEditCompany(selected.companyName ?? "");
    setEditAssign(selected.assignedTo ?? "");
    setEditProg(selected.program?.id ?? "");
    setShowEdit(true);
  }

  async function saveEdit() {
    if (!selected) return;
    setEditSaving(true);
    await fetch(`/api/clients/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: editFirst,
        lastName: editLast,
        email: editEmail,
        phone: editPhone || null,
        companyName: editCompany || null,
        assignedTo: editAssign || null,
        programId: editProg || null,
      }),
    });
    setEditSaving(false);
    setShowEdit(false);
    loadClientDetail(selected);
    fetchClients();
  }

  // ─── Client detail view ─────────────────────────────────────────────────────
  if (selected) {
    const tasks = selected.tasks ?? [];
    const pending   = tasks.filter(t => t.status !== "complete");
    const completed = tasks.filter(t => t.status === "complete");
    const overdue   = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "complete");
    const programSteps = selected.program?.steps ?? [];
    const completions = selected.stepCompletions ?? [];
    const completedStepIds = new Set(completions.map(sc => sc.stepId));
    const completedCount = programSteps.filter(s => completedStepIds.has(s.id)).length;
    const totalSteps = programSteps.length;

    const tabList = ["overview", "journey", "tasks", "documents", "updates", "notes"] as const;

    return (
      <div>
        <button onClick={() => setSelected(null)} style={{
          background: "transparent", border: "none", color: "#A0A0A0",
          cursor: "pointer", fontSize: 13, marginBottom: 20, padding: 0,
        }}>&larr; Back to Clients</button>

        {/* Header */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", gap: isMobile ? 14 : 0, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 600, color: "#F0F0F0", margin: 0, marginBottom: 6 }}>
              {selected.firstName} {selected.lastName}
            </h1>
            <div style={{ color: "#A0A0A0", fontSize: isMobile ? 13 : 14 }}>{selected.email}</div>
            {selected.companyName && <div style={{ color: "#606060", fontSize: 13, marginTop: 2 }}>Company: {selected.companyName}</div>}
            {selected.program && <div style={{ color: "#606060", fontSize: 13, marginTop: 2 }}>Program: {selected.program.name}</div>}
            <div style={{ color: "#606060", fontSize: 13, marginTop: 2 }}>Assigned To: {selected.assignedTo ?? "Unassigned"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: isMobile ? "stretch" : "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <select
                value={selected.status}
                onChange={e => updateStatus(selected.id, e.target.value)}
                disabled={updatingId === selected.id}
                style={{ ...inp, width: isMobile ? "100%" : "auto", fontSize: 13, padding: "7px 12px", flex: isMobile ? 1 : undefined }}
              >
                {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <button onClick={() => deleteClient(selected.id)} style={{
                background: "transparent", border: "1px solid rgba(255,107,107,0.2)", color: "#FF6B6B",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}>Delete</button>
            </div>
            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`mailto:${selected.email}`} target="_blank" rel="noopener noreferrer" style={{ ...actionBtn, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 14 }}>&#9993;</span> Email
              </a>
              <button onClick={() => { setDetailTab("tasks"); setShowTaskForm(true); }} style={actionBtn}>
                + Add Task
              </button>
              <button onClick={() => { setDetailTab("notes"); setShowNoteForm(true); fetchNotes(selected.id); }} style={actionBtn}>
                + Add Note
              </button>
              <button onClick={openEdit} style={actionBtn}>
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Edit Client Form */}
        {showEdit && (
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 15, color: "#F0F0F0" }}>Edit Client</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>First Name</label>
                <input value={editFirst} onChange={e => setEditFirst(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Last Name</label>
                <input value={editLast} onChange={e => setEditLast(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Email</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Phone</label>
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Company</label>
                <input value={editCompany} onChange={e => setEditCompany(e.target.value)} style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Assigned To</label>
                <input value={editAssign} onChange={e => setEditAssign(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Program</label>
                <select value={editProg} onChange={e => setEditProg(e.target.value)} style={inp}>
                  <option value="">None</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEdit} disabled={editSaving} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                opacity: editSaving ? 0.7 : 1,
              }}>{editSaving ? "Saving..." : "Save Changes"}</button>
              <button onClick={() => setShowEdit(false)} style={{
                background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
              }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Detail Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid #2A2A2A", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {tabList.map(tab => (
            <button key={tab} onClick={() => {
              setDetailTab(tab);
              if (tab === "notes" && selected) fetchNotes(selected.id);
            }} style={{
              padding: isMobile ? "10px 14px" : "10px 18px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
              background: "transparent", textTransform: "capitalize", whiteSpace: "nowrap", flexShrink: 0,
              color: detailTab === tab ? "#C8F04A" : "#606060",
              borderBottom: detailTab === tab ? "2px solid #C8F04A" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
            }}>{tab === "updates" ? "Updates" : tab}</button>
          ))}
        </div>

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {detailTab === "overview" && (
          <div>
            {/* Onboarding progress */}
            {totalSteps > 0 && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 12 }}>Onboarding Progress</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ flex: 1, background: "#2A2A2A", borderRadius: 99, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`, height: "100%", background: "#C8F04A", borderRadius: 99, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#A0A0A0", whiteSpace: "nowrap" }}>{completedCount} / {totalSteps} steps</span>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Tasks Pending",   value: pending.length },
                { label: "Tasks Completed", value: completed.length },
                { label: "Days Since Activity", value: selected.lastActivityAt ? Math.floor((Date.now() - new Date(selected.lastActivityAt).getTime()) / 86400000) : "N/A" },
                { label: "Overdue Tasks",   value: overdue.length },
              ].map(s => (
                <div key={s.label} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: "14px 18px" }}>
                  <div style={{ color: "#606060", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 300, color: s.label === "Overdue Tasks" && typeof s.value === "number" && s.value > 0 ? "#FF6B6B" : "#F0F0F0" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Step completion list */}
            {programSteps.length > 0 && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0", marginBottom: 14 }}>Step Completion</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {programSteps.map(step => {
                    const sc = completions.find(c => c.stepId === step.id);
                    const done = !!sc;
                    return (
                      <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: done ? "rgba(200,240,74,0.15)" : "#2A2A2A",
                          border: done ? "2px solid #C8F04A" : "2px solid #3A3A3A",
                        }}>
                          {done && <span style={{ color: "#C8F04A", fontSize: 12, fontWeight: 900 }}>&#10003;</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: done ? "#F0F0F0" : "#808080" }}>{step.title}</div>
                        </div>
                        <div style={{ fontSize: 11, color: done ? "#A0A0A0" : "#505050", whiteSpace: "nowrap" }}>
                          {done ? `Completed ${fmtDate(sc.completedAt)}` : "Pending"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ JOURNEY TAB ════════════════ */}
        {detailTab === "journey" && (
          <div>
            {programSteps.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ color: "#606060", fontSize: 13 }}>No program steps configured for this client.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {programSteps.map((step, idx) => {
                  const sc = completions.find(c => c.stepId === step.id);
                  const done = !!sc;
                  const isLast = idx === programSteps.length - 1;

                  // Determine what to show for completed steps
                  let completionDetail: React.ReactNode = null;
                  if (done) {
                    if (step.type === "intake_form") {
                      const sub = (selected.formSubmissions ?? []).find(() => true);
                      if (sub && sub.answers?.length) {
                        completionDetail = (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                            {sub.answers.map((a, i) => (
                              <div key={i} style={{ fontSize: 12, color: "#A0A0A0" }}>{a.value}</div>
                            ))}
                          </div>
                        );
                      }
                    } else if (step.type === "agreement") {
                      const acc = (selected.agreementAcceptances ?? []).find(a => a.stepId === step.id);
                      if (acc) {
                        completionDetail = (
                          <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>
                            Signed by <span style={{ color: "#F0F0F0" }}>{acc.fullName}</span> on {fmtDate(acc.acceptedAt)}
                          </div>
                        );
                      }
                    } else if (step.type === "task") {
                      completionDetail = (
                        <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>
                          Completed on {fmtDate(sc.completedAt)}
                        </div>
                      );
                    } else if (step.type === "checkin") {
                      const ci = (selected.checkInSubmissions ?? []).find(c => c.stepId === step.id);
                      if (ci) {
                        const answers = parseCheckInAnswers(ci.answers);
                        completionDetail = (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                            {answers.completed && <div style={{ fontSize: 12, color: "#A0A0A0" }}><span style={{ color: "#606060" }}>Completed:</span> {answers.completed}</div>}
                            {answers.stuck && <div style={{ fontSize: 12, color: "#A0A0A0" }}><span style={{ color: "#606060" }}>Stuck on:</span> {answers.stuck}</div>}
                            {answers.confidence && <div style={{ fontSize: 12, color: "#A0A0A0" }}><span style={{ color: "#606060" }}>Confidence:</span> {answers.confidence}/10</div>}
                            {answers.nextAction && <div style={{ fontSize: 12, color: "#A0A0A0" }}><span style={{ color: "#606060" }}>Next action:</span> {answers.nextAction}</div>}
                          </div>
                        );
                      }
                    } else if (step.type === "resource") {
                      completionDetail = (
                        <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>
                          Viewed on {fmtDate(sc.completedAt)}
                        </div>
                      );
                    } else {
                      completionDetail = (
                        <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 8 }}>
                          Completed on {fmtDate(sc.completedAt)}
                        </div>
                      );
                    }
                  }

                  return (
                    <div key={step.id} style={{ display: "flex", gap: 14 }}>
                      {/* Timeline line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 32, flexShrink: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: done ? "rgba(200,240,74,0.15)" : "#1A1A1A",
                          border: done ? "2px solid #C8F04A" : "2px solid #3A3A3A",
                          fontSize: 14, flexShrink: 0,
                        }}>
                          {done ? <span style={{ color: "#C8F04A", fontWeight: 900, fontSize: 14 }}>&#10003;</span> : <span>{stepTypeIcons[step.type] ?? "&#9679;"}</span>}
                        </div>
                        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 20, background: done ? "#C8F04A" : "#2A2A2A" }} />}
                      </div>
                      {/* Step content */}
                      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20, minWidth: 0 }}>
                        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: isMobile ? 14 : 18 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 16 }}>{stepTypeIcons[step.type] ?? "&#9679;"}</span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: done ? "#F0F0F0" : "#808080" }}>{step.title}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                              background: done ? "rgba(200,240,74,0.1)" : "rgba(96,96,96,0.1)",
                              color: done ? "#C8F04A" : "#606060", marginLeft: "auto",
                            }}>{done ? "Complete" : "Pending"}</span>
                          </div>
                          {step.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 4 }}>{step.description}</div>}
                          {done ? completionDetail : (
                            <div style={{ fontSize: 12, color: "#505050", marginTop: 8, fontStyle: "italic" }}>Not yet completed</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TASKS TAB ════════════════ */}
        {detailTab === "tasks" && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>Tasks</div>
            <button onClick={() => setShowTaskForm(!showTaskForm)} style={{
              background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
            }}>+ Add Task</button>
          </div>

          {showTaskForm && (
            <form onSubmit={addTask} style={{ background: "#1A1A1A", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #2A2A2A" }}>
              <div style={{ marginBottom: 10 }}>
                <input value={tTitle} onChange={e => setTTitle(e.target.value)} placeholder="Task title *" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 10, marginBottom: 12 }}>
                <input value={tDesc} onChange={e => setTDesc(e.target.value)} placeholder="Description (optional)" style={inp} />
                <input type="date" value={tDue} onChange={e => setTDue(e.target.value)} style={inp} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={tSaving} style={{
                  background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                  padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                  opacity: tSaving ? 0.7 : 1,
                }}>
                  {tSaving ? "Saving..." : "Add Task"}
                </button>
                <button type="button" onClick={() => setShowTaskForm(false)} style={{
                  background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                  padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                }}>Cancel</button>
              </div>
            </form>
          )}

          {tasks.length === 0 ? (
            <div style={{ color: "#606060", fontSize: 13, padding: "16px 0", textAlign: "center" }}>No tasks yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[...pending, ...completed].map(t => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: 8, background: "#1A1A1A", opacity: t.status === "complete" ? 0.55 : 1,
                }}>
                  <button onClick={() => t.status !== "complete" && completeTask(t.id)} style={{
                    width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.status === "complete" ? "#C8F04A" : "#3A3A3A"}`,
                    background: t.status === "complete" ? "#C8F04A" : "transparent",
                    cursor: t.status === "complete" ? "default" : "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.status === "complete" && <span style={{ color: "#0F0F0F", fontSize: 11, fontWeight: 900 }}>&#10003;</span>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#F0F0F0", textDecoration: t.status === "complete" ? "line-through" : "none" }}>{t.title}</div>
                    {t.dueDate && <div style={{ fontSize: 11, color: "#606060", marginTop: 2 }}>Due {new Date(t.dueDate).toLocaleDateString()}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* ════════════════ DOCUMENTS TAB ════════════════ */}
        {detailTab === "documents" && (
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>Documents</div>
              <button onClick={() => setShowDocForm(!showDocForm)} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
              }}>+ Request Document</button>
            </div>

            {showDocForm && (
              <form onSubmit={createDocRequest} style={{ background: "#1A1A1A", borderRadius: 10, padding: 16, marginBottom: 16, border: "1px solid #2A2A2A" }}>
                <div style={{ marginBottom: 10 }}>
                  <input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="Document title (e.g. Government Issued ID) *" style={inp} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <input value={docDesc} onChange={e => setDocDesc(e.target.value)} placeholder="Instructions for client (optional)" style={inp} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: "#A0A0A0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" checked={docReq} onChange={e => setDocReq(e.target.checked)} style={{ accentColor: "#C8F04A" }} />
                    Required
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={docSaving} style={{
                    background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                    opacity: docSaving ? 0.7 : 1,
                  }}>{docSaving ? "Saving..." : "Send Request"}</button>
                  <button type="button" onClick={() => setShowDocForm(false)} style={{
                    background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  }}>Cancel</button>
                </div>
              </form>
            )}

            {docs.length === 0 ? (
              <div style={{ color: "#606060", fontSize: 13, padding: "16px 0", textAlign: "center" }}>No document requests yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {docs.map(d => (
                  <div key={d.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                    borderRadius: 8, background: "#1A1A1A",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0" }}>
                        {d.title}
                        {d.required && <span style={{ color: "#F0A94A", fontSize: 10, marginLeft: 6 }}>Required</span>}
                      </div>
                      {d.description && <div style={{ fontSize: 12, color: "#606060", marginTop: 2 }}>{d.description}</div>}
                      {d.fileName && <div style={{ fontSize: 11, color: "#A0A0A0", marginTop: 4 }}>File: {d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#C8F04A" }}>{d.fileName}</a> : d.fileName}</div>}
                      <div style={{ fontSize: 11, color: "#505050", marginTop: 4 }}>{new Date(d.requestedAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize",
                        background: d.status === "approved" ? "rgba(200,240,74,0.1)" : d.status === "uploaded" ? "rgba(96,165,250,0.1)" : "rgba(240,169,74,0.1)",
                        color: d.status === "approved" ? "#C8F04A" : d.status === "uploaded" ? "#60A5FA" : "#F0A94A",
                      }}>{d.status}</span>
                      {d.status === "uploaded" && (
                        <button onClick={() => approveDoc(d.id)} style={{
                          background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                          padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                        }}>Approve</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ UPDATES TAB ════════════════ */}
        {detailTab === "updates" && (
          <div>
            {(selected.checkInSubmissions ?? []).length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ color: "#606060", fontSize: 13 }}>No progress updates yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(selected.checkInSubmissions ?? []).map(ci => {
                  const answers = parseCheckInAnswers(ci.answers);
                  const conf = parseInt(answers.confidence || "0", 10);
                  return (
                    <div key={ci.id} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 20 }}>
                      <div style={{ fontSize: 11, color: "#606060", marginBottom: 12 }}>{fmtDate(ci.submittedAt)}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {answers.completed && (
                          <div>
                            <div style={{ fontSize: 11, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Completed</div>
                            <div style={{ fontSize: 13, color: "#F0F0F0" }}>{answers.completed}</div>
                          </div>
                        )}
                        {answers.stuck && (
                          <div>
                            <div style={{ fontSize: 11, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Stuck On</div>
                            <div style={{ fontSize: 13, color: "#F0F0F0" }}>{answers.stuck}</div>
                          </div>
                        )}
                        {answers.confidence && (
                          <div>
                            <div style={{ fontSize: 11, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Confidence: {conf}/10</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, background: "#2A2A2A", borderRadius: 99, height: 8, overflow: "hidden", maxWidth: 200 }}>
                                <div style={{ width: `${conf * 10}%`, height: "100%", background: confidenceColor(conf), borderRadius: 99, transition: "width 0.3s" }} />
                              </div>
                            </div>
                          </div>
                        )}
                        {answers.nextAction && (
                          <div>
                            <div style={{ fontSize: 11, color: "#606060", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Next Action</div>
                            <div style={{ fontSize: 13, color: "#F0F0F0" }}>{answers.nextAction}</div>
                          </div>
                        )}
                        {/* If no structured answers, show raw */}
                        {!answers.completed && !answers.stuck && !answers.confidence && !answers.nextAction && (
                          <div style={{ fontSize: 13, color: "#A0A0A0" }}>{ci.answers}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════ NOTES TAB ════════════════ */}
        {detailTab === "notes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#F0F0F0" }}>Notes</div>
              <button onClick={() => setShowNoteForm(!showNoteForm)} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
              }}>+ Add Note</button>
            </div>

            {showNoteForm && (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Write a note..."
                  rows={4}
                  style={{ ...inp, resize: "vertical", minHeight: 80 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={addNote} disabled={noteSaving || !noteContent.trim()} style={{
                    background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                    padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
                    opacity: noteSaving || !noteContent.trim() ? 0.7 : 1,
                  }}>{noteSaving ? "Saving..." : "Save Note"}</button>
                  <button onClick={() => { setShowNoteForm(false); setNoteContent(""); }} style={{
                    background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                    padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  }}>Cancel</button>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
                <div style={{ color: "#606060", fontSize: 13 }}>No notes yet.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notes.map(n => (
                  <div key={n.id} style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 10, padding: isMobile ? 14 : 18 }}>
                    <div style={{ fontSize: 13, color: "#F0F0F0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{n.content}</div>
                    <div style={{ fontSize: 11, color: "#505050", marginTop: 8 }}>Added {fmtDate(n.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Client list ──────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 16 : 24, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 400, color: "#F0F0F0", margin: 0, whiteSpace: "nowrap" }}>Clients</h1>
          {!isMobile && (
            <div style={{ display: "flex", background: "#1A1A1A", borderRadius: 8, border: "1px solid #2A2A2A", overflow: "hidden" }}>
              {(["list", "board"] as const).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  padding: "6px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
                  background: viewMode === mode ? "rgba(200,240,74,0.1)" : "transparent",
                  color: viewMode === mode ? "#C8F04A" : "#606060",
                  transition: "all 0.15s", textTransform: "capitalize",
                }}>{mode === "list" ? "List" : "Board"}</button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { setShowInvite(true); setIError(""); }} style={{
          background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
          padding: isMobile ? "8px 14px" : "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: isMobile ? 13 : 14,
          whiteSpace: "nowrap",
        }}>
          + Invite{!isMobile && " Client"}
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: isMobile ? 14 : 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          style={{ ...inp, flex: isMobile ? undefined : 1 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ ...inp, width: isMobile ? "50%" : 170 }}
          >
            <option value="all">All Statuses</option>
            {Object.entries(CLIENT_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
            style={{ ...inp, width: isMobile ? "50%" : 170 }}
          >
            <option value="all">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showInvite && (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 24, maxWidth: isMobile ? "100%" : 540 }}>
          <div style={{ fontWeight: 600, marginBottom: 18, fontSize: 15, color: "#F0F0F0" }}>Invite Client</div>
          <form onSubmit={inviteClient}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>First Name *</label>
                <input value={iFirst} onChange={e => setIFirst(e.target.value)} placeholder="Jane" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Last Name *</label>
                <input value={iLast} onChange={e => setILast(e.target.value)} placeholder="Smith" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Email *</label>
              <input type="email" value={iEmail} onChange={e => setIEmail(e.target.value)} placeholder="jane@example.com" style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Company Name</label>
                <input value={iCompany} onChange={e => setICompany(e.target.value)} placeholder="Acme Agency" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Assign To</label>
                <input value={iAssign} onChange={e => setIAssign(e.target.value)} placeholder="Team member name or email" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Phone</label>
              <input value={iPhone} onChange={e => setIPhone(e.target.value)} placeholder="+1 555 000 0000" style={inp} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 5 }}>Assign Program</label>
              {programs.length > 0 && (
                <select value={iProg} onChange={e => { setIProg(e.target.value); if (e.target.value) setINewProg(""); }} style={{ ...inp, marginBottom: 10 }}>
                  <option value="">Select existing or create new below</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {!iProg && (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                    {["DFY Ads Management", "DFY Lead Generation", "Insurance Policy Onboarding", "High Ticket Sales Onboarding", "Coaching Program Onboarding", "Marketing Retainer Onboarding", "Consulting Project Onboarding"].map(t => (
                      <button type="button" key={t} onClick={() => setINewProg(t)} style={{
                        padding: "5px 12px", borderRadius: 99, border: "1px solid",
                        borderColor: iNewProg === t ? "#C8F04A" : "#2A2A2A",
                        background: iNewProg === t ? "rgba(200,240,74,0.08)" : "transparent",
                        color: iNewProg === t ? "#C8F04A" : "#A0A0A0",
                        fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s",
                      }}>{t}</button>
                    ))}
                  </div>
                  <input value={iNewProg} onChange={e => setINewProg(e.target.value)} placeholder="Or type a custom program name..." style={inp} />
                </>
              )}
            </div>
            {iError && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 14 }}>{iError}</div>}
            <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <button type="submit" disabled={iSaving} style={{
                background: "#C8F04A", color: "#0F0F0F", fontWeight: 600,
                padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", opacity: iSaving ? 0.7 : 1,
                width: isMobile ? "100%" : "auto",
              }}>
                {iSaving ? "Sending..." : "Send Invite"}
              </button>
              <button type="button" onClick={() => setShowInvite(false)} style={{
                background: "transparent", color: "#A0A0A0", padding: "10px 20px",
                borderRadius: 8, border: "1px solid #2A2A2A", cursor: "pointer", fontSize: 14,
                width: isMobile ? "100%" : "auto",
              }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: "#606060", padding: "32px 0" }}>Loading clients...</div>
      ) : viewMode === "board" ? (
        filteredClients.length === 0 ? (
          <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>&#128101;</div>
            <div style={{ fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>{clients.length === 0 ? "No clients yet" : "No matching clients"}</div>
            <div style={{ color: "#A0A0A0" }}>{clients.length === 0 ? "Invite your first client to get started." : "Try adjusting your filters."}</div>
          </div>
        ) : (
          <KanbanBoard
            clients={filteredClients}
            onStatusChange={(clientId, status) => updateStatus(clientId, status)}
            onSelect={(c) => loadClientDetail(c as Client)}
          />
        )
      ) : filteredClients.length === 0 ? (
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: isMobile ? 32 : 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128101;</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#F0F0F0" }}>{clients.length === 0 ? "No clients yet" : "No matching clients"}</div>
          <div style={{ color: "#A0A0A0" }}>{clients.length === 0 ? "Invite your first client to get started." : "Try adjusting your filters."}</div>
        </div>
      ) : isMobile ? (
        /* Mobile: card-based list */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredClients.map(c => {
            const st = CLIENT_STATUS[c.status as ClientStatus] ?? CLIENT_STATUS.on_track;
            return (
              <div key={c.id} onClick={() => loadClientDetail(c)} style={{
                background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, padding: 16, cursor: "pointer",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 12, color: "#606060", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: st.bg, color: st.color, flexShrink: 0, marginLeft: 8 }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#606060" }}>
                  {c.program && <span>{c.program.name}</span>}
                  <span>{timeAgo(c.lastActivityAt)}</span>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={(e) => { e.stopPropagation(); loadClientDetail(c); }} style={{
                    background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                    padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, flex: 1,
                  }}>View</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} style={{
                    background: "transparent", border: "1px solid rgba(255,107,107,0.15)", color: "#FF6B6B",
                    padding: "6px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                  }}>&times;</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop: table */
        <div style={{ background: "#161616", border: "1px solid #2A2A2A", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2A2A2A" }}>
                {["Name", "Company", "Program", "Status", "Assigned To", "Last Active", ""].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: 11,
                    fontWeight: 600, color: "#606060", textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < filteredClients.length - 1 ? "1px solid #1E1E1E" : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: "#F0F0F0" }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 11, color: "#606060" }}>{c.email}</div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#A0A0A0", fontSize: 13 }}>{c.companyName ?? <span style={{ color: "#3A3A3A" }}>&mdash;</span>}</td>
                  <td style={{ padding: "14px 16px", color: "#A0A0A0", fontSize: 13 }}>{c.program?.name ?? <span style={{ color: "#3A3A3A" }}>&mdash;</span>}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <select
                      value={c.status}
                      onChange={e => updateStatus(c.id, e.target.value)}
                      disabled={updatingId === c.id}
                      onClick={e => e.stopPropagation()}
                      style={{
                        background: CLIENT_STATUS[c.status as ClientStatus]?.bg ?? "transparent",
                        color: CLIENT_STATUS[c.status as ClientStatus]?.color ?? "#F0F0F0",
                        border: "none", borderRadius: 99, padding: "3px 8px",
                        fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none",
                      }}
                    >
                      {Object.entries(CLIENT_STATUS).map(([k, v]) => (
                        <option key={k} value={k} style={{ background: "#1E1E1E", color: "#F0F0F0" }}>{v.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#A0A0A0", fontSize: 13 }}>{c.assignedTo ?? <span style={{ color: "#3A3A3A" }}>Unassigned</span>}</td>
                  <td style={{ padding: "14px 16px", color: "#606060", fontSize: 13 }}>{timeAgo(c.lastActivityAt)}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => loadClientDetail(c)} style={{
                        background: "transparent", border: "1px solid #2A2A2A", color: "#A0A0A0",
                        padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                      }}>View</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} style={{
                        background: "transparent", border: "1px solid rgba(255,107,107,0.15)", color: "#FF6B6B",
                        padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontSize: 12,
                      }}>&times;</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
