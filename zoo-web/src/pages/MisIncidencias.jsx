import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Page.css";
import { clearAuth, getAuth } from "../utils/mockAuth";
import { listIncidentsByOwner, updateIncident } from "../utils/mockIncidents";
import { listIncidentMessagesApi, sendIncidentMessageApi } from "../utils/api";

const CHAT_REFRESH_MS = 8000;

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function urgencyClass(urgency) {
  const u = String(urgency || "").toLowerCase();
  if (u.includes("cr")) return "urgency-critical";
  if (u.includes("alt")) return "urgency-high";
  if (u.includes("med")) return "urgency-medium";
  if (u.includes("baj")) return "urgency-low";
  return "urgency-medium";
}

function newMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // Fallback simple si no hay crypto.randomUUID
  return `MSG-${new Date().toISOString()}-${String(performance?.now?.() || 0).replace(".", "")}`;
}

function buildWebAuthorName(auth) {
  if (!auth) return "Usuario web";
  if (auth.kind === "empleado") return `Empleado - ${auth.label}`;
  if (auth.kind === "visitante") return `Visitante - ${auth.label}`;
  return auth.label || "Usuario web";
}

function normalizeMessage(raw) {
  const isInternal = Boolean(raw?.isInternal);
  const rawAuthor = String(raw?.authorName || "").trim();
  const isWebAuthor =
    rawAuthor.toLowerCase().startsWith("empleado - ") ||
    rawAuthor.toLowerCase().startsWith("visitante - ");

  const who = isWebAuthor ? rawAuthor : "Tecnico de Salesforce";

  return {
    id: raw?.id || newMessageId(),
    at: raw?.createdAt || new Date().toISOString(),
    author: isWebAuthor && !isInternal ? "user" : "it",
    text: raw?.text || "",
    who,
    isInternal,
  };
}

export default function MisIncidencias() {
  const navigate = useNavigate();
  const auth = useMemo(() => getAuth(), []);
  const [version, setVersion] = useState(0);
  const items = useMemo(
    () => {
      void version;
      return auth ? listIncidentsByOwner(auth.ownerKey) : [];
    },
    [auth, version]
  );
  const [selectedId, setSelectedId] = useState(() => items[0]?.id || null);
  const [edit, setEdit] = useState({ subject: "", description: "", zone: "" });
  const [message, setMessage] = useState("");
  const [remoteMessages, setRemoteMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatSending, setChatSending] = useState(false);

  useEffect(() => {
    if (!auth) navigate("/");
  }, [auth, navigate]);

  const selected = items.find((i) => i.id === selectedId) || null;
  const canEdit = selected?.status === "Nueva";

  const onLogout = () => {
    clearAuth();
    navigate("/");
  };

  const onSave = () => {
    if (!selected) return;
    if (!canEdit) return;
    const updated = updateIncident(selected.id, {
      subject: edit.subject.trim(),
      description: edit.description.trim(),
      zone: edit.zone.trim(),
    });
    if (!updated) return;
    setVersion((v) => v + 1);
  };

  const loadMessages = useCallback(async (incidentId, { silent = false } = {}) => {
    if (!incidentId || !auth) return;
    setChatError("");
    if (!silent) setChatLoading(true);
    try {
      const includeInternal = auth.kind === "empleado";
      const result = await listIncidentMessagesApi(incidentId, { includeInternal });
      setRemoteMessages(
        Array.isArray(result) ? result.map((message) => normalizeMessage(message)) : []
      );
    } catch (error) {
      setRemoteMessages([]);
      setChatError(error instanceof Error ? error.message : "No se pudieron cargar los mensajes");
    } finally {
      if (!silent) setChatLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!selected?.id) {
      setRemoteMessages([]);
      return;
    }
    loadMessages(selected.id);
  }, [selected?.id, loadMessages]);

  useEffect(() => {
    if (!selected?.id) return;
    const timer = setInterval(() => {
      void loadMessages(selected.id, { silent: true });
    }, CHAT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [selected?.id, loadMessages]);

  const sendMessage = async (text, isInternal = false) => {
    if (!selected) return;
    const t = String(text || "").trim();
    if (!t) return;
    setChatError("");
    setChatSending(true);
    try {
      await sendIncidentMessageApi(selected.id, {
        text: t,
        isInternal,
        authorName: buildWebAuthorName(auth),
      });
      await loadMessages(selected.id);
      const updated = updateIncident(selected.id, { updatedAt: new Date().toISOString() });
      if (updated) setVersion((v) => v + 1);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "No se pudo enviar el mensaje");
    } finally {
      setChatSending(false);
    }
  };

  if (!auth) return null;

  return (
    <main className="page">
      <header className="page-hero">
        <h1>Mis incidencias</h1>
        <p>
          Sesión: <strong>{auth.label}</strong>
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn secondary" type="button" onClick={() => navigate("/")}>
            Volver a inicio
          </button>
          <button className="btn secondary" type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="page-grid">
        <div className="page-card">
          <h2>Listado</h2>
          {items.length === 0 ? (
            <p>No tienes incidencias todavía.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((i) => {
                const effectiveUrgency = i.internalProtocol ? "Crítica" : i.urgency;
                const uClass = urgencyClass(effectiveUrgency);

                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(i.id);
                      setEdit({
                        subject: i.subject || "",
                        description: i.description || "",
                        zone: i.zone || "",
                      });
                      setMessage("");
                    }}
                    className={`incident-row ${uClass}`}
                    aria-current={i.id === selectedId ? "true" : "false"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 600, textAlign: "left" }}>
                        {i.internalProtocol ? <span className="incident-star">★</span> : null}
                        {i.subject}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div className={`badge badge-urgency ${uClass}`}>{effectiveUrgency}</div>
                        <div className="badge">{i.status}</div>
                      </div>
                    </div>
                    <div className="muted" style={{ textAlign: "left" }}>
                      {i.category} · {i.zone} · {formatDate(i.createdAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="page-card">
          <h2>Detalle</h2>
          {!selected ? (
            <p>Selecciona una incidencia del listado.</p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div className="muted">
                <div>
                  <strong>ID:</strong> {selected.id}
                </div>
                <div>
                  <strong>Creada:</strong> {formatDate(selected.createdAt)}
                </div>
                <div>
                  <strong>Actualizada:</strong> {formatDate(selected.updatedAt)}
                </div>
              </div>

              <label className="field">
                Asunto
                <input
                  value={edit.subject}
                  onChange={(e) => setEdit((p) => ({ ...p, subject: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="field">
                Zona / Ubicación
                <input
                  value={edit.zone}
                  onChange={(e) => setEdit((p) => ({ ...p, zone: e.target.value }))}
                  disabled={!canEdit}
                />
              </label>

              <label className="field">
                Descripción
                <textarea
                  value={edit.description}
                  onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))}
                  disabled={!canEdit}
                  rows={6}
                />
              </label>

              {!canEdit && (
                <div className="note">
                  Esta incidencia ya no está en estado “Nueva”, por eso no se puede editar (simulado).
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn primary" type="button" onClick={onSave} disabled={!canEdit}>
                  Guardar cambios
                </button>
              </div>

              <div className="chat">
                <div className="chat-head">
                  <h3>Mensajes</h3>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Chat sincronizado con Salesforce
                    </div>
                  </div>
                </div>

                <div className="chat-body">
                  {chatLoading ? (
                    <div className="muted">Cargando mensajes...</div>
                  ) : remoteMessages.length === 0 ? (
                    <div className="muted">Todavía no hay mensajes.</div>
                  ) : (
                    <div className="chat-list">
                      {remoteMessages.map((m) => (
                        <div
                          key={m.id}
                          className={`chat-msg ${m.author === "it" ? "from-it" : "from-user"}`}
                        >
                          <div className="chat-meta">
                            <span className="chat-who">{m.who}</span>
                            <span className="chat-at">{formatDate(m.at)}</span>
                          </div>
                          <div className="chat-text">{m.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {chatError && <div className="note">{chatError}</div>}

                <form
                  className="chat-compose"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await sendMessage(message, false);
                    setMessage("");
                  }}
                >
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe un mensaje…"
                  />
                  <button className="btn primary" type="submit" disabled={!message.trim() || chatSending}>
                    {chatSending ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

