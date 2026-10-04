import React, { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clipboard, LogOut, Moon, RefreshCw, ShieldCheck, Sun, Table2, Users, X } from "lucide-react";
import "./superadmin.css";

const ACTION_LABELS = {
  "staff.activated": "Compte activé",
  "staff.deactivate": "Compte désactivé",
  "staff.revoke_sessions": "Sessions fermées",
  "staff.issue_activation_code": "Code d’activation émis",
  "admin.table_read": "Consultation de données",
  "admin.tables_read": "Consultation de données",
  "admin.audit_read": "Consultation du journal",
};

const ERROR_LABELS = {
  cannot_deactivate_self: "Vous ne pouvez pas désactiver votre propre compte.",
  last_superadmin: "Impossible : c’est le dernier superadmin.",
  confirmation_required: "Tapez DESACTIVER pour confirmer.",
  role_already_active: "Un compte actif existe déjà pour ce rôle.",
  staff_not_found: "Compte du personnel introuvable.",
  staff_already_inactive: "Ce compte est déjà inactif.",
  rate_limited: "Trop de requêtes, patientez.",
  authentication_required: "Votre session est requise.",
  forbidden: "Accès interdit.",
};

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? "") : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatCell(value, key = "") {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (/(date|_at|created|updated|expires)/i.test(key) && typeof value === "string") return formatDate(value);
  return String(value);
}

function PageState({ children }) {
  return <div className="sa-state">{children}</div>;
}

export default function SuperadminDashboard({ theme, onToggleTheme, onLogout, user, onSessionExpired }) {
  const [tab, setTab] = useState("tables");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [audit, setAudit] = useState(null);
  const [team, setTeam] = useState([]);
  const [page, setPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [codeModal, setCodeModal] = useState(null);
  const [issueRole, setIssueRole] = useState("livreur");
  const [issueDays, setIssueDays] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  async function api(path, options = {}) {
    const response = await fetch(path, { credentials: "same-origin", ...options });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      onSessionExpired();
      throw new Error("authentication_required");
    }
    if (response.status === 403) throw new Error("forbidden");
    if (response.status === 429) throw new Error("rate_limited");
    if (!response.ok) throw new Error(body.error || "admin_request_failed");
    return body;
  }

  async function loadTables() {
    setLoading(true); setError("");
    try {
      const body = await api("/api/admin/tables");
      setTables(Array.isArray(body.data) ? body.data : []);
    } catch (e) {
      setError(ERROR_LABELS[e.message] || "Impossible de charger les tables.");
    } finally { setLoading(false); }
  }

  async function loadTable(name, nextPage = 1) {
    setTableLoading(true); setError("");
    try {
      const body = await api("/api/admin/table?name=" + encodeURIComponent(name) + "&page=" + nextPage + "&pageSize=50");
      setSelectedTable(name);
      setTableData(body.data || null);
      setPage(nextPage);
    } catch (e) {
      setError(ERROR_LABELS[e.message] || "Impossible de lire cette table.");
    } finally { setTableLoading(false); }
  }

  async function loadAudit(nextPage = 1) {
    setLoading(true); setError("");
    try {
      const body = await api("/api/admin/audit?page=" + nextPage);
      setAudit(body.data || null);
      setAuditPage(nextPage);
    } catch (e) {
      setError(ERROR_LABELS[e.message] || "Impossible de charger le journal.");
    } finally { setLoading(false); }
  }

  async function loadTeam() {
    setLoading(true); setError("");
    try {
      const body = await api("/api/admin/table?name=auth.staff_users&page=" + teamPage + "&pageSize=50");
      setTeam(body.data?.rows || []);
    } catch (e) {
      setError(ERROR_LABELS[e.message] || "Impossible de charger l’équipe.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (tab === "tables") loadTables();
    if (tab === "audit") loadAudit(1);
    if (tab === "team") loadTeam();
  }, [tab]);

  useEffect(() => {
    if (tab === "team") loadTeam();
  }, [teamPage]);

  async function runAction(action, params, confirm = "") {
    setActionLoading(true); setError("");
    try {
      return await api("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, params, confirm }),
      });
    } catch (e) {
      setError(ERROR_LABELS[e.message] || "Action impossible.");
      return null;
    } finally { setActionLoading(false); }
  }

  async function revokeSessions(publicId) {
    if (!window.confirm("Fermer toutes les sessions de ce compte ?")) return;
    const result = await runAction("staff.revoke_sessions", { publicId });
    if (result) loadTeam();
  }

  async function deactivate() {
    if (!confirmTarget) return;
    const result = await runAction("staff.deactivate", { publicId: confirmTarget.public_id }, confirmText);
    if (result) { setConfirmTarget(null); setConfirmText(""); loadTeam(); }
  }

  async function issueCode(event) {
    event.preventDefault();
    const result = await runAction("staff.issue_activation_code", { role: issueRole, days: Number(issueDays) }, "");
    if (result?.data?.code) setCodeModal(result.data.code);
  }

  const visibleAudit = audit?.rows || [];
  const visibleTeam = team;
  const canNextTable = tableData ? page * (tableData.pageSize || 50) < tableData.totalRows : false;
  const canNextAudit = audit ? auditPage * (audit.pageSize || 50) < audit.totalRows : false;
  const canNextTeam = team.length === 50;

  return (
    <div className="sa-shell">
      <header className="sa-header">
        <div className="sa-identity">
          <div className="sa-mark"><ShieldCheck size={20}/></div>
          <div><strong>{user.name}</strong><span>Superadmin</span></div>
        </div>
        <div className="sa-header-actions">
          <button className="sa-icon" onClick={onToggleTheme} aria-label={theme === "dark" ? "Activer le thème clair" : "Activer le thème sombre"}>{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>
          <button className="sa-logout" onClick={onLogout}><LogOut size={17}/> Se déconnecter</button>
        </div>
      </header>

      <main className="sa-content">
        <nav className="sa-tabs" aria-label="Espace superadmin">
          <button className={tab === "tables" ? "active" : ""} onClick={()=>setTab("tables")}><Table2 size={17}/> Tables</button>
          <button className={tab === "audit" ? "active" : ""} onClick={()=>setTab("audit")}><ShieldCheck size={17}/> Journal</button>
          <button className={tab === "team" ? "active" : ""} onClick={()=>setTab("team")}><Users size={17}/> Équipe</button>
        </nav>

        {error && <div className="sa-alert" role="alert">{error}</div>}

        {tab === "tables" && (
          <section className="sa-panel">
            <div className="sa-panel-head"><div><span className="sa-eyebrow">Données</span><h1>Tables</h1><p>Consultation uniquement. Aucune modification directe.</p></div><button className="sa-icon" onClick={loadTables} aria-label="Actualiser"><RefreshCw size={17}/></button></div>
            {loading ? <PageState>Chargement des tables…</PageState> : !tables.length ? <PageState>Aucune table lisible.</PageState> : (
              <div className="sa-table-list">
                {tables.map(item => <button key={item.schema + "." + item.table} className={selectedTable === item.schema + "." + item.table ? "sa-table-card active" : "sa-table-card"} onClick={()=>loadTable(item.schema + "." + item.table)}>
                  <span><strong>{item.schema}.{item.table}</strong><small>Lecture seule</small></span><b>{item.rows}</b>
                </button>)}
              </div>
            )}
          </section>
        )}

        {tab === "tables" && selectedTable && (
          <section className="sa-panel">
            <div className="sa-panel-head"><div><span className="sa-eyebrow">{selectedTable}</span><h2>Lecture des lignes</h2><p>Lecture seule · {tableData?.totalRows ?? 0} ligne(s)</p></div></div>
            {tableLoading ? <PageState>Chargement…</PageState> : tableData && tableData.rows.length ? (
              <>
                <div className="sa-scroll"><table><thead><tr>{tableData.columns.map(column=><th key={column.column_name}>{column.column_name}</th>)}</tr></thead><tbody>{tableData.rows.map((row,index)=><tr key={String(row.public_id || row.id || index)}>{tableData.columns.map(column=><td key={column.column_name}>{formatCell(row[column.column_name], column.column_name)}</td>)}</tr>)}</tbody></table></div>
                <Pagination page={page} canPrev={page > 1} canNext={canNextTable} onPrev={()=>loadTable(selectedTable,page-1)} onNext={()=>loadTable(selectedTable,page+1)} />
              </>
            ) : <PageState>Aucune ligne.</PageState>}
          </section>
        )}

        {tab === "audit" && (
          <section className="sa-panel">
            <div className="sa-panel-head"><div><span className="sa-eyebrow">Traçabilité</span><h1>Journal</h1><p>Les actions les plus récentes en premier.</p></div><button className="sa-icon" onClick={()=>loadAudit(auditPage)} aria-label="Actualiser"><RefreshCw size={17}/></button></div>
            {loading ? <PageState>Chargement du journal…</PageState> : !visibleAudit.length ? <PageState>Aucune entrée.</PageState> : (
              <div className="sa-audit-list">{visibleAudit.map((row,index)=><article className="sa-audit-row" key={String(row.id || index)}><div><strong>{ACTION_LABELS[row.action] || row.action}</strong><span>{formatDate(row.created_at)}</span></div><p>Acteur : {row.actor_user_id || "Système"}</p><small>{row.target || "—"}</small></article>)}</div>
            )}
            {audit && <Pagination page={auditPage} canPrev={auditPage > 1} canNext={canNextAudit} onPrev={()=>loadAudit(auditPage-1)} onNext={()=>loadAudit(auditPage+1)} />}
          </section>
        )}

        {tab === "team" && (
          <>
            <section className="sa-panel">
              <div className="sa-panel-head"><div><span className="sa-eyebrow">Accès</span><h1>Équipe</h1><p>Gérez les sessions et les comptes du personnel.</p></div><button className="sa-icon" onClick={loadTeam} aria-label="Actualiser"><RefreshCw size={17}/></button></div>
              {loading ? <PageState>Chargement de l’équipe…</PageState> : !visibleTeam.length ? <PageState>Aucun compte.</PageState> : (
                <div className="sa-team-list">{visibleTeam.map(member => <article className="sa-team-card" key={member.public_id}><div className="sa-team-main"><div className="sa-avatar">{String(member.display_name || "?").slice(0,1).toUpperCase()}</div><div><strong>{member.display_name || "—"}</strong><span>{member.email || "—"}</span><small>{member.role} · {member.public_id}</small></div></div><span className={member.is_active ? "sa-active" : "sa-inactive"}>{member.is_active ? "Actif" : "Inactif"}</span><div className="sa-team-actions"><button className="sa-secondary" onClick={()=>revokeSessions(member.public_id)} disabled={actionLoading || !member.is_active}><RefreshCw size={15}/> Fermer ses sessions</button><button className="sa-danger" onClick={()=>{setConfirmTarget(member);setConfirmText("");}} disabled={actionLoading || !member.is_active}><X size={15}/> Désactiver</button></div></article>)}</div>
              )}
              {team.length > 0 && <Pagination page={teamPage} canPrev={teamPage > 1} canNext={canNextTeam} onPrev={()=>setTeamPage(p=>Math.max(1,p-1))} onNext={()=>setTeamPage(p=>p+1)} />}
            </section>

            <section className="sa-panel">
              <div className="sa-panel-head"><div><span className="sa-eyebrow">Provisionnement</span><h2>Émettre un code d’activation</h2><p>Un code temporaire, affiché une seule fois.</p></div></div>
              <form className="sa-issue-form" onSubmit={issueCode}>
                <label>Rôle<select value={issueRole} onChange={e=>setIssueRole(e.target.value)}><option value="superadmin">superadmin</option><option value="mere-fonde">mere-fonde</option><option value="livreur">livreur</option></select></label>
                <label>Durée<select value={issueDays} onChange={e=>setIssueDays(Number(e.target.value))}>{Array.from({length:14},(_,i)=>i+1).map(days=><option key={days} value={days}>{days} jour{days > 1 ? "s" : ""}</option>)}</select></label>
                <button className="sa-primary" disabled={actionLoading}>Émettre le code</button>
              </form>
            </section>
          </>
        )}
      </main>

      {confirmTarget && (
          <div className="sa-modal-backdrop">
          <section className="sa-modal" onClick={e=>e.stopPropagation()}>
            <button className="sa-modal-close" onClick={()=>setConfirmTarget(null)} aria-label="Fermer"><X size={18}/></button>
            <span className="sa-eyebrow">Confirmation</span>
            <h2>Désactiver {confirmTarget.display_name || confirmTarget.public_id} ?</h2>
            <p>Cette action ferme aussi toutes ses sessions.</p>
            <label>Tapez DESACTIVER<input autoFocus value={confirmText} onChange={e=>setConfirmText(e.target.value)} /></label>
            <button className="sa-danger sa-confirm" disabled={confirmText !== "DESACTIVER" || actionLoading} onClick={deactivate}>Désactiver</button>
          </section>
        </div>
      )}

      {codeModal && (
        <div className="sa-modal-backdrop" onClick={()=>setCodeModal(null)}>
          <section className="sa-modal sa-code-modal" onClick={e=>e.stopPropagation()}>
            <button className="sa-modal-close" onClick={()=>setCodeModal(null)} aria-label="Fermer"><X size={18}/></button>
            <div className="sa-code-icon"><Check size={22}/></div>
            <span className="sa-eyebrow">Code d’activation</span>
            <h2>{codeModal}</h2>
            <p>Ce code ne sera plus affiché.</p>
            <button className="sa-primary" onClick={()=>navigator.clipboard?.writeText(codeModal)}><Clipboard size={16}/> Copier</button>
          </section>
        </div>
      )}
    </div>
  );
}

function Pagination({ page, canPrev, canNext, onPrev, onNext }) {
  return <div className="sa-pagination">
    <button className="sa-secondary" disabled={!canPrev} onClick={onPrev}><ChevronLeft size={16}/> Précédent</button>
    <span>Page {page}</span>
    <button className="sa-secondary" disabled={!canNext} onClick={onNext}>Suivant <ChevronRight size={16}/></button>
  </div>;
}
