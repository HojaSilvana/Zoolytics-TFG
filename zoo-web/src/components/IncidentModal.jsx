import { useEffect, useId, useMemo, useState } from "react";
import "./IncidentModal.css";
import { createIncident } from "../utils/mockIncidents";
import { createIncidentApi } from "../utils/api";

const CATEGORIES = [
  "Mantenimiento",
  "Seguridad",
  "Atención Visitante",
  "Veterinaria",
  "Acceso",
  "Otro",
];

const URGENCIES = ["Baja", "Media", "Alta"];

const ZONES = ["Zona 1", "Zona 2", "Zona 3", "Entrada", "Administración", "Otra"];

const EMPLOYEE_SESSION_KEY = "zoo.employeeAuth.v1";

function createInitialFormState() {
  return {
    subject: "",
    description: "",
    category: "Mantenimiento",
    zone: "Entrada",
    urgency: "Media",

    // visitante
    contactName: "",
    contactEmailOrPhone: "",
    wantsResponse: true,
    consent: false,

    // empleado
    employeeId: "",
    employeeDepartment: "",
    internalProtocol: false,
  };
}

function createInitialEmployeeLoginState() {
  return {
    employeeId: "",
    password: "",
  };
}

function validateEmployeeCredentials({ employeeId, password }) {
  // PROTOTIPO: validación local. Sustituir por OAuth/SSO o backend real.
  if (!employeeId?.trim()) return false;
  if (!password?.trim()) return false;
  return password === "zoo2026";
}

export default function IncidentModal({ open, role, onClose }) {
  const titleId = useId();

  const roleLabel = useMemo(() => {
    if (role === "empleado") return "Empleado";
    if (role === "visitante") return "Visitante";
    return "";
  }, [role]);

  const [form, setForm] = useState(createInitialFormState);

  const [employeeLogin, setEmployeeLogin] = useState(createInitialEmployeeLoginState);
  const [employeeAuth, setEmployeeAuth] = useState(() => {
    try {
      return sessionStorage.getItem(EMPLOYEE_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [employeeAuthError, setEmployeeAuthError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const resetModalState = () => {
    setForm(createInitialFormState());
    setEmployeeAuthError("");
    setSubmitError("");
    setSubmitting(false);
    setEmployeeLogin(createInitialEmployeeLoginState());
  };

  const handleClose = () => {
    resetModalState();
    onClose?.();
  };

  if (!open) return null;

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const onSubmit = async (e) => {
    e.preventDefault();

    if (role === "empleado" && !employeeAuth) return;
    if (!form.subject.trim() || !form.description.trim() || !form.zone.trim()) return;
    if (role === "visitante" && form.wantsResponse && !form.contactEmailOrPhone.trim()) return;
    if (role === "visitante" && !form.consent) return;
    if (role === "empleado" && !form.employeeId.trim()) return;

    const ownerKey =
      role === "empleado"
        ? `emp:${form.employeeId.trim()}`
        : `vis:${form.contactEmailOrPhone.trim().toLowerCase()}`;

    const effectiveUrgency =
      role === "empleado" && form.urgency === "Alta" && form.internalProtocol ? "Critica" : form.urgency;

    setSubmitError("");
    setSubmitting(true);
    try {
      const payload = {
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category,
        zone: form.zone.trim(),
        urgency: effectiveUrgency,
        role: roleLabel,
        contactEmailOrPhone: form.contactEmailOrPhone?.trim() || "",
        internalProtocol: role === "empleado" ? Boolean(form.internalProtocol) : false,
      };

      const result = await createIncidentApi(payload);
      const salesforceId = result?.id;
      if (!salesforceId) {
        throw new Error("Salesforce no devolvió el id de la incidencia");
      }

      createIncident({
        id: salesforceId,
        role,
        ownerKey,
        subject: payload.subject,
        description: payload.description,
        category: payload.category,
        zone: payload.zone,
        urgency: payload.urgency,
        contactName: form.contactName?.trim() || "",
        contactEmailOrPhone: payload.contactEmailOrPhone,
        employeeId: form.employeeId?.trim() || "",
        employeeDepartment: form.employeeDepartment?.trim() || "",
        internalProtocol: payload.internalProtocol,
      });

      handleClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No se pudo crear la incidencia");
    } finally {
      setSubmitting(false);
    }
  };

  const onEmployeeLoginSubmit = (e) => {
    e.preventDefault();
    setEmployeeAuthError("");

    const ok = validateEmployeeCredentials(employeeLogin);
    if (!ok) {
      setEmployeeAuth(false);
      setEmployeeAuthError("Credenciales inválidas. Revisa el ID y la contraseña.");
      return;
    }

    setEmployeeAuth(true);
    try {
      sessionStorage.setItem(EMPLOYEE_SESSION_KEY, "true");
    } catch {
      // ignore
    }
    // Pre-rellenar el ID en el formulario, para no pedirlo dos veces
    update({ employeeId: employeeLogin.employeeId });
  };

  const requiresContact = role === "visitante" && form.wantsResponse;
  const showVisitorFields = role === "visitante";
  const showEmployeeFields = role === "empleado";
  const needsEmployeeLogin = role === "empleado" && !employeeAuth;

  return (
    <div
      className="incident-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="incident-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="incident-header">
          <div>
            <h2 id={titleId}>
              {needsEmployeeLogin ? "Acceso empleado" : `Nueva incidencia (${roleLabel})`}
            </h2>
            <p>
              {needsEmployeeLogin
                ? "Inicia sesión para acceder al formulario de empleado."
                : "Rellena los datos y envía el aviso."}
            </p>
          </div>
          <button className="incident-close" type="button" onClick={handleClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        {needsEmployeeLogin ? (
          <form className="incident-form" onSubmit={onEmployeeLoginSubmit}>
            <div className="grid">
              <label>
                ID de empleado*
                <input
                  value={employeeLogin.employeeId}
                  onChange={(e) =>
                    setEmployeeLogin((p) => ({ ...p, employeeId: e.target.value }))
                  }
                  placeholder="Ej: dc1234"
                  required
                  autoFocus
                />
              </label>

              <label>
                Contraseña*
                <input
                  value={employeeLogin.password}
                  onChange={(e) => setEmployeeLogin((p) => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  type="password"
                  required
                />
              </label>
            </div>

            {employeeAuthError && <div className="incident-error">{employeeAuthError}</div>}

            <div className="actions">
              <button type="button" className="btn secondary" onClick={handleClose}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Acceder
              </button>
            </div>
          </form>
        ) : (
          <form className="incident-form" onSubmit={onSubmit}>
          <div className="grid">
            <label>
              Asunto*
              <input
                value={form.subject}
                onChange={(e) => update({ subject: e.target.value })}
                placeholder="Ej: Grieta en cristal del aviario"
                required
              />
            </label>

            <label>
              Categoría*
              <select
                value={form.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Zona / Ubicación*
              <select
                value={form.zone}
                onChange={(e) => update({ zone: e.target.value })}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Urgencia*
              <select
                value={form.urgency}
                onChange={(e) => {
                  const urgency = e.target.value;
                  update({
                    urgency,
                    internalProtocol: urgency === "Alta" ? form.internalProtocol : false,
                  });
                }}
              >
                {URGENCIES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Descripción*
            <textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Describe lo ocurrido y cualquier detalle útil."
              rows={5}
              required
            />
          </label>

          {showVisitorFields && (
            <div className="section">
              <h3>Datos de contacto (visitante)</h3>

              <div className="grid">
                <label>
                  Nombre (opcional)
                  <input
                    value={form.contactName}
                    onChange={(e) => update({ contactName: e.target.value })}
                    placeholder="Tu nombre"
                  />
                </label>

                <label>
                  ¿Quieres respuesta?
                  <select
                    value={String(form.wantsResponse)}
                    onChange={(e) => update({ wantsResponse: e.target.value === "true" })}
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>

                <label className={requiresContact ? "" : "muted"}>
                  Email o teléfono{requiresContact ? "*" : " (opcional)"}
                  <input
                    value={form.contactEmailOrPhone}
                    onChange={(e) => update({ contactEmailOrPhone: e.target.value })}
                    placeholder="correo@ejemplo.com o +34..."
                    required={requiresContact}
                  />
                </label>
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update({ consent: e.target.checked })}
                  required
                />
                Acepto que se usen mis datos para gestionar la incidencia*
              </label>
            </div>
          )}

          {showEmployeeFields && (
            <div className="section">
              <h3>Datos internos (empleado)</h3>
              <div className="grid">
                <label>
                  Identificador empleado*
                  <input
                    value={form.employeeId}
                    onChange={(e) => update({ employeeId: e.target.value })}
                    placeholder="Ej: dc1234"
                    required
                  />
                </label>
                <label>
                  Departamento (opcional)
                  <input
                    value={form.employeeDepartment}
                    onChange={(e) => update({ employeeDepartment: e.target.value })}
                    placeholder="Ej: Mantenimiento"
                  />
                </label>
              </div>

              {form.urgency === "Alta" && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(form.internalProtocol)}
                    onChange={(e) => update({ internalProtocol: e.target.checked })}
                  />
                  Activar protocolo interno (se registrará como “Crítica” para Salesforce)
                </label>
              )}
            </div>
          )}

          {submitError && <div className="incident-error">{submitError}</div>}

          <div className="actions">
            <button type="button" className="btn secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar incidencia"}
            </button>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}

