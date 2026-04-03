"use client";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

type Client = {
  id: string; firstName: string; lastName: string; companyName: string | null;
  status: string; lastActivityAt: string | null;
};

const COLUMNS = [
  { id: "new",        title: "New",        statuses: ["new"] },
  { id: "onboarding", title: "Onboarding", statuses: ["onboarding"] },
  { id: "active",     title: "Active",     statuses: ["on_track"] },
  { id: "at_risk",    title: "At Risk",    statuses: ["needs_attention", "stuck"] },
  { id: "churned",    title: "Churned",    statuses: ["churned"] },
];

const COL_COLORS: Record<string, string> = {
  new: "#60A5FA",
  onboarding: "#A78BFA",
  active: "#C8F04A",
  at_risk: "#F0A94A",
  churned: "#808080",
};

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "No activity";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Active today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function initials(first: string, last: string) {
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function statusForColumn(colId: string): string {
  if (colId === "new") return "new";
  if (colId === "onboarding") return "onboarding";
  if (colId === "active") return "on_track";
  if (colId === "at_risk") return "needs_attention";
  return "churned";
}

export default function KanbanBoard({
  clients,
  onStatusChange,
  onSelect,
}: {
  clients: Client[];
  onStatusChange: (clientId: string, status: string) => void;
  onSelect: (client: Client) => void;
}) {
  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const destColId = result.destination.droppableId;
    const clientId = result.draggableId;
    const newStatus = statusForColumn(destColId);
    onStatusChange(clientId, newStatus);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{
        display: "flex", gap: 14, overflowX: "auto",
        paddingBottom: 8, minHeight: 400,
      }}>
        {COLUMNS.map(col => {
          const colClients = clients.filter(c => col.statuses.includes(c.status));
          const color = COL_COLORS[col.id];
          return (
            <div key={col.id} style={{
              minWidth: 240, width: 240, flexShrink: 0,
              background: "#161616", border: "1px solid #2A2A2A",
              borderRadius: 12, display: "flex", flexDirection: "column",
            }}>
              {/* Column header */}
              <div style={{
                padding: "14px 16px 10px", borderBottom: "1px solid #2A2A2A",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
                }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#F0F0F0" }}>{col.title}</span>
                <span style={{
                  fontSize: 11, color: "#606060", fontWeight: 500,
                  marginLeft: "auto",
                }}>{colClients.length}</span>
              </div>

              {/* Cards */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      flex: 1, padding: 8, overflowY: "auto", minHeight: 80,
                      background: snapshot.isDraggingOver ? "rgba(200,240,74,0.03)" : "transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    {colClients.map((client, idx) => (
                      <Draggable key={client.id} draggableId={client.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            onClick={() => onSelect(client)}
                            style={{
                              ...prov.draggableProps.style,
                              background: snap.isDragging ? "#1E1E1E" : "#1A1A1A",
                              border: `1px solid ${snap.isDragging ? "#3A3A3A" : "#2A2A2A"}`,
                              borderRadius: 10, padding: "12px 14px", marginBottom: 8,
                              cursor: "pointer", userSelect: "none",
                              boxShadow: snap.isDragging ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
                              transition: "box-shadow 0.15s",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: "rgba(200,240,74,0.08)", border: "1px solid #2A2A2A",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 700, color: "#A0A0A0", flexShrink: 0,
                              }}>
                                {initials(client.firstName, client.lastName)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: "#F0F0F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {client.firstName} {client.lastName}
                                </div>
                                {client.companyName && (
                                  <div style={{ fontSize: 11, color: "#606060", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {client.companyName}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: "#505050" }}>
                              {daysAgo(client.lastActivityAt)}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
