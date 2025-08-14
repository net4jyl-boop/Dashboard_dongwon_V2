import React, { useMemo, useState, useCallback, useEffect } from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 16,
            background: "#1f2937",
            color: "#fff",
            minHeight: "100vh",
          }}
        >
          <h2>⚠️ 화면 렌더 중 오류가 발생했습니다</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
          </pre>
          {this.state.info?.componentStack && (
            <details style={{ marginTop: 8 }}>
              <summary>자세히</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              border: "1px solid #374151",
              borderRadius: 8,
              background: "#111827",
              color: "#fff",
            }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const STATUSES = [
  { key: "Available", label: "빈 도크" },
  { key: "Scheduled", label: "배정됨" },
  { key: "Unloading", label: "언로딩" },
  { key: "Loading", label: "로딩" },
  { key: "LooseUnloading", label: "루즈카고 언로딩" },
  { key: "Completed", label: "완료" },
  { key: "Maintenance", label: "보수중" },
  { key: "Delayed", label: "지연" },
  { key: "Starkist", label: "Starkist 전용" },
];
const COLOR = {
  Available: {
    ring: "#10b981",
    stripe: "#10b981",
    badgeBg: "#d1fae5",
    badgeFg: "#0b0f14",
    badgeBr: "#34d399",
  },
  Scheduled: {
    ring: "#f472b6",
    stripe: "#f472b6",
    badgeBg: "#fce7f3",
    badgeFg: "#0b0f14",
    badgeBr: "#f9a8d4",
  },
  Unloading: {
    ring: "#facc15",
    stripe: "#facc15",
    badgeBg: "#fef9c3",
    badgeFg: "#0b0f14",
    badgeBr: "#fde047",
  },
  Loading: {
    ring: "#3b82f6",
    stripe: "#3b82f6",
    badgeBg: "#dbeafe",
    badgeFg: "#0b0f14",
    badgeBr: "#93c5fd",
  },
  LooseUnloading: {
    ring: "#f59e0b",
    stripe: "#f59e0b",
    badgeBg: "#fef3c7",
    badgeFg: "#0b0f14",
    badgeBr: "#fbbf24",
  },
  Completed: {
    ring: "#a3a3a3",
    stripe: "#a3a3a3",
    badgeBg: "#e5e7eb",
    badgeFg: "#0b0f14",
    badgeBr: "#d4d4d8",
  },
  Maintenance: {
    ring: "#f43f5e",
    stripe: "#f43f5e",
    badgeBg: "#ffe4e6",
    badgeFg: "#0b0f14",
    badgeBr: "#fb7185",
  },
  Delayed: {
    ring: "#ef4444",
    stripe: "#ef4444",
    badgeBg: "#fee2e2",
    badgeFg: "#0b0f14",
    badgeBr: "#f87171",
  },
  Starkist: {
    ring: "#a855f7",
    stripe: "#a855f7",
    badgeBg: "#ede9fe",
    badgeFg: "#0b0f14",
    badgeBr: "#c4b5fd",
  },
};
const STARTABLE = new Set(["Unloading", "Loading", "LooseUnloading"]);
const SCHEDULE_START_HOUR = 8;
const SCHEDULE_END_HOUR = 17;
const HOUR_HEIGHT = 60;
const DOCK_IDS = Array.from({ length: 21 }, (_, i) => i + 1);

const pageBg = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e5e7eb",
  padding: 16,
};
const compactCardBase = {
  minHeight: 128,
  borderRadius: 12,
  border: "1px solid #2b2f36",
  boxShadow: "0 2px 8px rgba(0,0,0,.35)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};
const cardWrap = {
  background: "#0f1318",
  border: "1px solid #2b2f36",
  borderRadius: 14,
  padding: 12,
};
const inputStyle = {
  background: "#0d1117",
  color: "#e5e7eb",
  border: "1px solid #30363d",
  borderRadius: 8,
  padding: "8px 10px",
};
const btnPrimary = {
  background: "#238636",
  color: "#fff",
  border: "1px solid #2ea043",
  borderRadius: 999,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnGhost = {
  background: "#21262d",
  color: "#e5e7eb",
  border: "1px solid #30363d",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnTiny = { ...btnGhost, padding: "2px 6px", fontSize: 12 };

function pad2(n) {
  return String(n).padStart(2, "0");
}
function fmtDuration(sec) {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function toLocalISO(dt) {
  const d = new Date(dt);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const MM = pad2(d.getMinutes());
  const SS = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}
function poolLabel(key) {
  switch (key) {
    case "unassigned":
      return "미배정 (Unassigned)";
    case "break":
      return "휴식 (On Break)";
    case "absent":
      return "결근 (Absent)";
    case "starkist":
      return "Starkist C/D";
    default:
      return key || "";
  }
}
function getDnDPayload(e) {
  try {
    const raw = e.dataTransfer?.getData("text/plain");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.crewId ? obj : null;
  } catch {
    return null;
  }
}

const initDocks = DOCK_IDS.map((num) => ({
  id: `dock_${num}`,
  name: `Dock ${num}`,
  status: "Available",
  assignment: null,
  crewIds: [],
  startedAt: null,
  runningLabel: null,
}));
const initCrew = ["C01", "C02", "C03", "C04", "C05"].map((id) => ({
  id,
  pool: "unassigned",
}));
const initNames = {
  C01: "김철수",
  C02: "이영희",
  C03: "박민수",
  C04: "최지우",
  C05: "John",
};

export default function App() {
  return (
    <ErrorBoundary>
      <InnerApp />
    </ErrorBoundary>
  );
}

function InnerApp() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [docks, setDocks] = useState(initDocks);
  const [crewPool, setCrewPool] = useState(initCrew);
  const [crewNames, setCrewNames] = useState(initNames);
  const [editingDock, setEditingDock] = useState(null);
  const [query, setQuery] = useState("");
  const [filterSet, setFilterSet] = useState(
    new Set(STATUSES.map((s) => s.key))
  );
  const [crewMgrOpen, setCrewMgrOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const getName = useCallback((id) => crewNames[id] || id, [crewNames]);
  const kpis = useMemo(() => {
    const busy = docks.filter(
      (d) => d.startedAt || STARTABLE.has(d.status)
    ).length;
    return { utilization: Math.round((busy / docks.length) * 100) };
  }, [docks]);
  const cycleStatus = (dockId) => {
    setDocks((prev) =>
      prev.map((d) => {
        if (d.id !== dockId) return d;
        const i = STATUSES.findIndex((s) => s.key === d.status);
        return { ...d, status: STATUSES[(i + 1) % STATUSES.length].key };
      })
    );
  };
  const setDockStatus = (dockId, statusKey) => {
    setDocks((prev) =>
      prev.map((d) => (d.id === dockId ? { ...d, status: statusKey } : d))
    );
  };
  const toggleAll = () =>
    setFilterSet((p) =>
      p.size === STATUSES.length
        ? new Set()
        : new Set(STATUSES.map((s) => s.key))
    );
  const toggleFilter = (key) =>
    setFilterSet((p) => {
      const n = new Set(p);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const onDragStartCrew = (e, crewId, fromDockId = null, fromPool = null) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ crewId, fromDockId, fromPool })
    );
  };
  const dropToDock = (dockId, e) => {
    e.preventDefault();
    const p = getDnDPayload(e);
    if (!p) return;
    const { crewId, fromDockId } = p;
    setDocks((prev) =>
      prev.map((d) =>
        fromDockId && d.id === fromDockId
          ? { ...d, crewIds: d.crewIds.filter((x) => x !== crewId) }
          : d
      )
    );
    setCrewPool((prev) => prev.filter((c) => c.id !== crewId));
    setDocks((prev) =>
      prev.map((d) =>
        d.id === dockId
          ? d.crewIds.includes(crewId)
            ? d
            : { ...d, crewIds: [...d.crewIds, crewId] }
          : d
      )
    );
  };
  const dropToPool = (pool) => (e) => {
    e.preventDefault();
    const p = getDnDPayload(e);
    if (!p) return;
    const { crewId, fromDockId } = p;
    if (fromDockId) {
      setDocks((prev) =>
        prev.map((d) =>
          d.id === fromDockId
            ? { ...d, crewIds: d.crewIds.filter((x) => x !== crewId) }
            : d
        )
      );
    }
    setCrewPool((prev) => {
      const exists = prev.find((c) => c.id === crewId);
      return exists
        ? prev.map((c) => (c.id === crewId ? { ...c, pool } : c))
        : [{ id: crewId, pool }, ...prev];
    });
  };

  const nextCrewId = () => {
    for (let i = 1; i < 100; i++) {
      const id = "C" + String(i).padStart(2, "0");
      if (
        !crewNames[id] &&
        !crewPool.find((c) => c.id === id) &&
        !docks.some((d) => d.crewIds.includes(id))
      )
        return id;
    }
    let n = 100;
    for (;;) {
      const id = "C" + n++;
      if (
        !crewNames[id] &&
        !crewPool.find((c) => c.id === id) &&
        !docks.some((d) => d.crewIds.includes(id))
      )
        return id;
    }
  };
  const addCrew = (name, pool = "unassigned") => {
    const id = nextCrewId();
    setCrewNames((p) => ({ ...p, [id]: name || id }));
    setCrewPool((p) => [{ id, pool }, ...p]);
  };
  const renameCrew = (id, newName) =>
    setCrewNames((p) => ({ ...p, [id]: newName || id }));
  const deleteCrew = (id) => {
    setCrewPool((p) => p.filter((c) => c.id !== id));
    setDocks((p) =>
      p.map((d) => ({ ...d, crewIds: d.crewIds.filter((x) => x !== id) }))
    );
    setCrewNames((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  };

  const saveDock = (dockId, patch) => {
    setDocks((p) => p.map((d) => (d.id === dockId ? { ...d, ...patch } : d)));
    setEditingDock(null);
  };

  const toggleTimer = (dockId) => {
    setDocks((prev) =>
      prev.map((d) => {
        if (d.id !== dockId) return d;
        if (d.startedAt) {
          const start = d.startedAt;
          const end = Date.now();
          setRecords((old) => [
            {
              dockId: d.id,
              dockName: d.name,
              startMs: start,
              endMs: end,
              label:
                d.runningLabel ||
                (STATUSES.find((s) => s.key === d.status)?.label ?? d.status),
              carrier: d.assignment?.carrier || "",
              trailer: d.assignment?.trailer || "",
              destination: d.assignment?.destination || "",
            },
            ...old,
          ]);
          return {
            ...d,
            startedAt: null,
            runningLabel: null,
            status: "Completed",
          };
        }
        if (!STARTABLE.has(d.status)) return d;
        const startLabel =
          STATUSES.find((s) => s.key === d.status)?.label ?? d.status;
        return { ...d, startedAt: Date.now(), runningLabel: startLabel };
      })
    );
  };

  const exportCSV = () => {
    const header = [
      "Dock ID",
      "Dock Name",
      "Start Time",
      "End Time",
      "Duration(sec)",
      "Label",
      "Carrier",
      "Trailer",
      "Destination",
    ];
    const rows = records.map((r) => {
      const dur = Math.max(0, Math.round((r.endMs - r.startMs) / 1000));
      return [
        r.dockId,
        r.dockName,
        toLocalISO(r.startMs),
        toLocalISO(r.endMs),
        dur,
        r.label,
        r.carrier,
        r.trailer,
        r.destination,
      ];
    });
    const all = [...[header], ...rows];
    const csv = all
      .map((cols) =>
        cols
          .map((v) => {
            const s = String(v ?? "");
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = toLocalISO(Date.now()).replace(/[: ]/g, "-");
    a.download = `dock_records_${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const visibleDocks = useMemo(
    () =>
      docks.filter((d) => {
        if (!filterSet.has(d.status)) return false;
        if (!query) return true;
        const t = [d.name, d.assignment?.trailer, d.assignment?.carrier]
          .join(" ")
          .toLowerCase();
        return t.includes(query.toLowerCase());
      }),
    [docks, filterSet, query]
  );
  const crewRows = useMemo(() => {
    const ids = new Set();
    crewPool.forEach((c) => ids.add(c.id));
    docks.forEach((d) => d.crewIds.forEach(ids.add, ids));
    return [...ids].map((id) => {
      const pool = crewPool.find((c) => c.id === id);
      const dock = docks.find((d) => d.crewIds.includes(id));
      const loc = pool ? poolLabel(pool.pool) : dock ? dock.name : "unknown";
      return { id, name: getName(id), loc };
    });
  }, [crewPool, docks, crewNames, getName]);

  return (
    <div style={pageBg}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#0b0f14",
          paddingBottom: 8,
          marginBottom: 12,
          borderBottom: "1px solid #2b2f36",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22 }}>🚚</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>
                Dock Operations
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                {activeTab === "dashboard"
                  ? "대시보드 • 21 Docks • 7×3"
                  : "작업 시간표 • 08:00–17:00"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              style={{
                ...btnGhost,
                ...(activeTab === "dashboard"
                  ? { borderColor: "#2ea043" }
                  : {}),
              }}
            >
              📊 대시보드
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("schedule")}
              style={{
                ...btnGhost,
                ...(activeTab === "schedule" ? { borderColor: "#2ea043" } : {}),
              }}
            >
              📅 작업 시간표
            </button>
            <button
              type="button"
              onClick={() => setCrewMgrOpen(true)}
              style={btnPrimary}
            >
              👥 Crew 관리
            </button>
            <button type="button" onClick={exportCSV} style={btnGhost}>
              📤 기록 CSV
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={btnGhost}
            >
              ↻ 새로고침
            </button>
          </div>
        </div>
      </div>
      {activeTab === "dashboard" ? (
        <>
          <div style={cardWrap}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색: 도크/트레일러/캐리어"
                style={{ ...inputStyle, minWidth: 240 }}
              />
              <button type="button" onClick={toggleAll} style={btnPrimary}>
                {filterSet.size === STATUSES.length
                  ? "상태 전체 해제"
                  : "상태 전체 선택"}
              </button>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {STATUSES.map((s) => {
                  const on = filterSet.has(s.key);
                  const col = COLOR[s.key];
                  return (
                    <label
                      key={s.key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `2px solid ${col.ring}`,
                        background: on ? col.badgeBg : "transparent",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#0b0f14",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleFilter(s.key)}
                      />
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: col.stripe,
                        }}
                      />
                      <span>{s.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
              gap: 16,
              margin: "16px 0",
            }}
          >
            <Pool
              title={poolLabel("unassigned")}
              list={crewPool.filter((c) => c.pool === "unassigned")}
              hint="여기로 드롭하면 미배정"
              onDrop={dropToPool("unassigned")}
              onDragStartCrew={onDragStartCrew}
              getName={getName}
            />
            <Pool
              title={poolLabel("break")}
              list={crewPool.filter((c) => c.pool === "break")}
              hint="여기로 드롭하면 휴식"
              onDrop={dropToPool("break")}
              onDragStartCrew={onDragStartCrew}
              getName={getName}
            />
            <Pool
              title={poolLabel("absent")}
              list={crewPool.filter((c) => c.pool === "absent")}
              hint="여기로 드롭하면 결근"
              onDrop={dropToPool("absent")}
              onDragStartCrew={onDragStartCrew}
              getName={getName}
            />
            <Pool
              title={poolLabel("starkist")}
              list={crewPool.filter((c) => c.pool === "starkist")}
              hint="여기로 드롭하면 Starkist C/D"
              onDrop={dropToPool("starkist")}
              onDragStartCrew={onDragStartCrew}
              getName={getName}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {visibleDocks.map((d) => (
              <DockCard
                key={d.id}
                dock={d}
                onCycleStatus={cycleStatus}
                onSetStatus={setDockStatus}
                onDropCrew={(e) => dropToDock(d.id, e)}
                onEdit={() => setEditingDock(d)}
                onDragStartCrew={onDragStartCrew}
                onToggleTimer={toggleTimer}
                getName={getName}
              />
            ))}
          </div>
          {editingDock && (
            <EditModal
              dock={editingDock}
              onClose={() => setEditingDock(null)}
              onSave={(id, patch) => saveDock(id, patch)}
            />
          )}{" "}
          {crewMgrOpen && (
            <CrewManagerModal
              rows={crewRows}
              onClose={() => setCrewMgrOpen(false)}
              onAdd={addCrew}
              onRename={renameCrew}
              onDelete={deleteCrew}
              moveTo={(id, pool) => {
                setDocks((p) =>
                  p.map((d) =>
                    d.crewIds.includes(id)
                      ? { ...d, crewIds: d.crewIds.filter((x) => x !== id) }
                      : d
                  )
                );
                setCrewPool((p) => {
                  const ex = p.find((c) => c.id === id);
                  return ex
                    ? p.map((c) => (c.id === id ? { ...c, pool } : c))
                    : [{ id, pool }, ...p];
                });
              }}
            />
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              marginTop: 16,
            }}
          >
            <Kpi title="Utilization" value={`${kpis.utilization}%`} />
            <Kpi title="Avg Turn" value="—" />
            <Kpi title="Queue" value="—" />
            <Kpi
              title="Crew Total"
              value={
                crewPool.length +
                docks.reduce((n, d) => n + d.crewIds.length, 0)
              }
            />
          </div>
        </>
      ) : (
        <ScheduleView docks={docks} records={records} />
      )}
    </div>
  );
}

function Pool({ title, list, onDrop, onDragStartCrew, hint, getName }) {
  return (
    <section style={{ ...cardWrap }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        title={hint}
        style={{
          minHeight: 110,
          border: "2px dashed #3a3f47",
          borderRadius: 12,
          padding: 10,
          background: "#0d1117",
        }}
      >
        {list.length === 0 && (
          <div style={{ color: "#9ca3af", fontSize: 13 }}>비어있습니다.</div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {list.map((c) => (
            <div
              key={c.id}
              title={getName(c.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                userSelect: "none",
                background: "#161b22",
                border: "1px solid #30363d",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 13,
                cursor: "grab",
              }}
              draggable
              onDragStart={(e) => onDragStartCrew(e, c.id, null, c.pool)}
            >
              👷 {getName(c.id)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DockCard({
  dock,
  onCycleStatus,
  onSetStatus,
  onDropCrew,
  onEdit,
  onDragStartCrew,
  onToggleTimer,
  getName,
}) {
  const col = COLOR[dock.status];
  const cardBg = col.badgeBg;
  const textColor = col.badgeFg;
  const running = !!dock.startedAt;
  const elapsedSec = running
    ? Math.max(0, Math.round((Date.now() - dock.startedAt) / 1000))
    : 0;
  const canStart = !running && STARTABLE.has(dock.status);
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCrew}
      style={{
        ...compactCardBase,
        background: cardBg,
        color: textColor,
        boxShadow: `inset 0 0 0 4px ${col.ring}, 0 2px 8px rgba(0,0,0,.35)`,
      }}
      title="Crew를 드래그해서 이 도크에 배치할 수 있습니다"
    >
      <div style={{ height: 6, background: col.stripe }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>🏗️</span>
          <div style={{ fontWeight: 800, fontSize: 15 }}>{dock.name}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <select
            value={dock.status}
            onChange={(e) => onSetStatus(dock.id, e.target.value)}
            title="도크 상태 수동 변경"
            style={{
              ...btnTiny,
              background: "#ffffffaa",
              color: "#0b0f14",
              border: `2px solid ${col.badgeBr}`,
              padding: "2px 6px",
              fontSize: 11,
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 10px 8px",
        }}
      >
        <div style={{ fontSize: 12, opacity: running ? 1 : 0.85 }}>
          ⏱️{" "}
          {running
            ? `진행중 ${fmtDuration(elapsedSec)} (${dock.runningLabel || ""})`
            : canStart
            ? "대기중 — 시작 가능"
            : "대기중 — 시작 불가 상태"}
          {running && dock.startedAt && (
            <span style={{ marginLeft: 6, color: "#111" }}>
              ({new Date(dock.startedAt).toLocaleTimeString()})
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleTimer(dock.id)}
          disabled={!running && !canStart}
          style={{
            ...btnTiny,
            background: running ? "#7f1d1d" : canStart ? "#1f6feb" : "#4b5563",
            borderColor: running ? "#b91c1c" : canStart ? "#1f6feb" : "#4b5563",
            color: "#fff",
            fontWeight: 800,
            opacity: !running && !canStart ? 0.6 : 1,
            cursor: !running && !canStart ? "not-allowed" : "pointer",
          }}
          title={
            running
              ? "종료하여 기록 저장(상태 '완료'로 변경)"
              : canStart
              ? "작업 시작"
              : "이 상태에서는 시작할 수 없습니다"
          }
        >
          {running ? "⛔ 종료" : "⏱️ 시작"}
        </button>
      </div>
      <div style={{ padding: "0 10px 10px" }}>
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.4,
            marginBottom: 6,
            background: "#ffffffbb",
            color: "#0b0f14",
            padding: "6px 8px",
            borderRadius: 8,
            border: "1px solid #00000022",
          }}
        >
          {dock.assignment ? (
            <>
              <div>
                🚚 캐리어: <b>{dock.assignment.carrier || "-"}</b>
              </div>
              <div>
                🛞 트레일러: <b>{dock.assignment.trailer || "-"}</b>
              </div>
              <div>
                🎯 목적지: <b>{dock.assignment.destination || "-"}</b>
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.75 }}>배정된 차량 없음</div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {dock.crewIds.length === 0 && (
            <span style={{ fontSize: 12, opacity: 0.75 }}>작업 인원 없음</span>
          )}
          {dock.crewIds.map((id) => (
            <div
              key={id}
              title={getName(id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                userSelect: "none",
                background: "#ffffffaa",
                color: "#0b0f14",
                border: "1px solid #00000033",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "grab",
              }}
              draggable
              onDragStart={(e) => onDragStartCrew(e, id, dock.id, null)}
            >
              👷 {getName(id)}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 6,
          padding: "6px 10px",
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          style={{ ...btnTiny, padding: "2px 8px", fontSize: 11 }}
        >
          ✏️ Edit
        </button>
      </div>
    </div>
  );
}

function EditModal({ dock, onClose, onSave }) {
  const [status, setStatus] = useState(dock.status);
  const [carrier, setCarrier] = useState(dock.assignment?.carrier || "");
  const [trailer, setTrailer] = useState(dock.assignment?.trailer || "");
  const [destination, setDestination] = useState(
    dock.assignment?.destination || ""
  );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.55)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: "92vw",
          background: "#0d1117",
          color: "#e5e7eb",
          border: "1px solid #2b2f36",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            borderBottom: "1px solid #2b2f36",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>{dock.name} 편집</div>
          <button
            type="button"
            onClick={onClose}
            style={{ ...btnGhost, width: 32, height: 28 }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            padding: 14,
            display: "grid",
            gap: 10,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <span>상태</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ ...inputStyle, minWidth: 0 }}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div
            style={{
              gridColumn: "1 / -1",
              height: 1,
              background: "#2b2f36",
              margin: "4px 0 6px",
            }}
          />
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <span>캐리어</span>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            <span>트레일러</span>
            <input
              value={trailer}
              onChange={(e) => setTrailer(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label
            style={{
              display: "grid",
              gap: 6,
              fontSize: 13,
              gridColumn: "1 / -1",
            }}
          >
            <span>목적지</span>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={inputStyle}
            />
          </label>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: 12,
            borderTop: "1px solid #2b2f36",
          }}
        >
          <button type="button" onClick={onClose} style={btnGhost}>
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              onSave(dock.id, {
                status,
                assignment:
                  carrier || trailer || destination
                    ? { carrier, trailer, destination }
                    : null,
              })
            }
            style={btnPrimary}
          >
            ✅ 저장
          </button>
        </div>
      </div>
    </div>
  );
}

function CrewManagerModal({
  rows,
  onClose,
  onAdd,
  onRename,
  onDelete,
  moveTo,
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const [newName, setNewName] = useState("");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.55)",
        zIndex: 99999,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: 820,
          maxWidth: "96vw",
          background: "#0d1117",
          color: "#e5e7eb",
          border: "1px solid #2b2f36",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.6)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            borderBottom: "1px solid #2b2f36",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 16 }}>👥 Crew 관리</div>
          <button
            type="button"
            onClick={onClose}
            style={{ ...btnGhost, width: 32, height: 28, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ ...inputStyle, minWidth: 0, flex: 1 }}
              placeholder="새 작업자 이름 입력"
            />
            <button
              type="button"
              onClick={() => {
                const n = newName.trim();
                if (!n) return;
                onAdd?.(n, "unassigned");
                setNewName("");
              }}
              style={{ ...btnPrimary, cursor: "pointer" }}
            >
              ➕ 추가
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#a3a3a3" }}>
                  <th
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #2b2f36",
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #2b2f36",
                    }}
                  >
                    이름
                  </th>
                  <th
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #2b2f36",
                    }}
                  >
                    현재 위치
                  </th>
                  <th
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #2b2f36",
                    }}
                  >
                    빠른 이동
                  </th>
                  <th
                    style={{
                      padding: "8px 6px",
                      borderBottom: "1px solid #2b2f36",
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {safeRows.length > 0 ? (
                  safeRows.map((r) => (
                    <tr
                      key={r.id}
                      style={{ borderBottom: "1px solid #2b2f36" }}
                    >
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                        {r.id}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <EditNameCell
                          id={r.id}
                          name={r.name}
                          onSave={onRename}
                        />
                      </td>
                      <td style={{ padding: "8px 6px" }}>{r.loc}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          <button
                            type="button"
                            onClick={() => moveTo?.(r.id, "unassigned")}
                            style={{ ...btnTiny, cursor: "pointer" }}
                          >
                            미배정
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTo?.(r.id, "break")}
                            style={{ ...btnTiny, cursor: "pointer" }}
                          >
                            휴식
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTo?.(r.id, "absent")}
                            style={{ ...btnTiny, cursor: "pointer" }}
                          >
                            결근
                          </button>
                          <button
                            type="button"
                            onClick={() => moveTo?.(r.id, "starkist")}
                            style={{ ...btnTiny, cursor: "pointer" }}
                          >
                            Starkist C/D
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "8px 6px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => onDelete?.(r.id)}
                          style={{
                            ...btnTiny,
                            borderColor: "#7f1d1d",
                            color: "#ffaaaa",
                            cursor: "pointer",
                          }}
                        >
                          🗑️ 삭제
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "12px 6px", color: "#9ca3af" }}
                    >
                      작업자가 없습니다. 위에서 추가하세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div
          style={{
            padding: 12,
            borderTop: "1px solid #2b2f36",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{ ...btnPrimary, cursor: "pointer" }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}

function EditNameCell({ id, name, onSave }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(name);
  return editing ? (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSave?.(id, temp || id);
            setEditing(false);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setTemp(name);
          }
        }}
        style={{ ...inputStyle, padding: "6px 8px", minWidth: 180 }}
      />
      <button
        type="button"
        onClick={() => {
          onSave?.(id, temp || id);
          setEditing(false);
        }}
        style={{ ...btnTiny, cursor: "pointer" }}
      >
        💾 저장
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setTemp(name);
        }}
        style={{ ...btnTiny, cursor: "pointer" }}
      >
        ✖️ 취소
      </button>
    </div>
  ) : (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <span>{name}</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{ ...btnTiny, cursor: "pointer" }}
      >
        ✏️ 수정
      </button>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={cardWrap}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ color: "#a3a3a3", fontSize: 13 }}>{title}</div>
        <div>⏱️</div>
      </div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ScheduleView({ docks, records }) {
  const now = Date.now();
  const d = new Date();
  const gridStart = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    SCHEDULE_START_HOUR,
    0,
    0
  ).getTime();
  const gridEnd = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    SCHEDULE_END_HOUR,
    0,
    0
  ).getTime();
  const dockOrder = docks
    .slice()
    .sort(
      (a, b) =>
        parseInt(a.id.split("_")[1], 10) - parseInt(b.id.split("_")[1], 10)
    );
  const runningBlocks = docks
    .filter((d) => d.startedAt && d.startedAt < gridEnd)
    .map((d) => ({
      dockId: d.id,
      dockName: d.name,
      startMs: Math.max(d.startedAt, gridStart),
      endMs: Math.min(now, gridEnd),
      label: d.runningLabel || "작업중",
      live: true,
    }));
  const fixedBlocks = records
    .filter((r) => r.endMs > gridStart && r.startMs < gridEnd)
    .map((r) => ({
      ...r,
      startMs: Math.max(r.startMs, gridStart),
      endMs: Math.min(r.endMs, gridEnd),
      live: false,
    }));
  const blocks = [...fixedBlocks, ...runningBlocks];
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `120px repeat(${dockOrder.length}, 1fr)`,
    columnGap: 1,
  };
  const timeColStyle = { background: "#0f1318", border: "1px solid #2b2f36" };
  const dockHeaderStyle = {
    background: "#193a63",
    color: "#e5e7eb",
    border: "1px solid #2b2f36",
    padding: "6px 8px",
    fontWeight: 700,
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };
  const pickBlockColor = (label) => {
    /루즈|loose/i.test(label)
      ? "#fbbf24"
      : /언로딩|unloading/i.test(label)
      ? "#fde047"
      : /로딩|loading/i.test(label)
      ? "#93c5fd"
      : "#c4b5fd";
  };
  return (
    <div style={{ ...cardWrap, padding: 0 }}>
      <div style={gridStyle}>
        <div
          style={{ ...dockHeaderStyle, position: "sticky", left: 0, zIndex: 2 }}
        >
          시간
        </div>
        {dockOrder.map((d) => (
          <div key={d.id} style={dockHeaderStyle}>
            {d.name}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `120px repeat(${dockOrder.length}, 1fr)`,
          columnGap: 1,
        }}
      >
        <div style={{ ...timeColStyle, position: "relative" }}>
          {Array.from(
            { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR + 1 },
            (_, i) => SCHEDULE_START_HOUR + i
          ).map((h, idx) => (
            <div
              key={h}
              style={{
                height: HOUR_HEIGHT,
                borderTop: idx === 0 ? "none" : "1px solid #2b2f36",
                padding: "2px 6px",
                fontSize: 12,
                color: "#9ca3af",
              }}
            >
              {pad2(h)}:00
            </div>
          ))}
          {now >= gridStart && now <= gridEnd && (
            <div
              style={{
                position: "absolute",
                top: ((now - gridStart) / 3600000) * HOUR_HEIGHT,
                left: 0,
                right: 0,
                height: 1,
                background: "#fffb",
              }}
            />
          )}
        </div>
        {dockOrder.map((dock) => {
          const colBlocks = blocks.filter((b) => b.dockId === dock.id);
          return (
            <div
              key={dock.id}
              style={{
                background: "#0d1117",
                border: "1px solid #2b2f36",
                position: "relative",
              }}
            >
              {Array.from(
                { length: SCHEDULE_END_HOUR - SCHEDULE_START_HOUR },
                (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: i * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: 1,
                      background: "#2b2f36",
                    }}
                  />
                )
              )}
              {colBlocks.map((b, idx) => {
                const top = ((b.startMs - gridStart) / 3600000) * HOUR_HEIGHT;
                const height = Math.max(
                  14,
                  ((b.endMs - b.startMs) / 3600000) * HOUR_HEIGHT
                );
                const bg = pickBlockColor(b.label || "");
                return (
                  <div
                    key={idx}
                    style={{
                      position: "absolute",
                      left: 4,
                      right: 4,
                      top,
                      height,
                      background: bg,
                      color: "#0b0f14",
                      border: `2px solid ${b.live ? "#ffffff" : "#0000"}`,
                      borderRadius: 6,
                      padding: "4px 6px",
                      boxShadow: "0 2px 6px rgba(0,0,0,.3)",
                      display: "flex",
                      alignItems: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.2,
                    }}
                    title={`${b.label} (${new Date(
                      b.startMs
                    ).toLocaleTimeString()} ~ ${new Date(
                      b.endMs
                    ).toLocaleTimeString()})`}
                  >
                    <div
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.label}
                      <div style={{ fontWeight: 600, fontSize: 11 }}>
                        {new Date(b.startMs).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" ~ "}
                        {new Date(b.endMs).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {b.live && (
                      <div
                        style={{
                          marginLeft: "auto",
                          fontSize: 10,
                          opacity: 0.8,
                        }}
                      >
                        LIVE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: 10,
          borderTop: "1px solid #2b2f36",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Legend color="#fde047" label="언로딩" />
        <Legend color="#93c5fd" label="로딩" />
        <Legend color="#fbbf24" label="루즈카고 언로딩" />
        <Legend color="#c4b5fd" label="기타" />
        <div style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 12 }}>
          진행중 블록 = 흰색 외곽선(LIVE)
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 3,
          background: color,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 12, color: "#e5e7eb" }}>{label}</span>
    </div>
  );
}
