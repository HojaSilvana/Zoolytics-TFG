import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AccessModal.css";
import { setAuth } from "../utils/mockAuth";

function generateOtp6() {
  // Evita Math.random (más robusto para demo)
  const arr = new Uint32Array(1);
  globalThis.crypto?.getRandomValues?.(arr);
  const n = arr[0] ?? 0;
  return String(100000 + (n % 900000));
}

const MOCK_EMPLOYEES = [
  { employeeId: "10001", pin: "1111", name: "Cuidador delfines" },
  { employeeId: "10002", pin: "2222", name: "Mantenimiento" },
];

function validateEmployee({ employeeId, pin }) {
  const id = employeeId?.trim();
  const p = pin?.trim();
  if (!id || !p) return null;
  return MOCK_EMPLOYEES.find((e) => e.employeeId === id && e.pin === p) || null;
}

export default function AccessModal({ open, onClose }) {
  const titleId = useId();
  const employeeTabId = useId();
  const visitorTabId = useId();
  const navigate = useNavigate();

  const [tab, setTab] = useState("empleado"); // "empleado" | "visitante"
  const [error, setError] = useState("");

  const [emp, setEmp] = useState({ employeeId: "", pin: "" });
  const [vis, setVis] = useState({ email: "", otp: "" });
  const [generatedOtp, setGeneratedOtp] = useState("");

  const tabLabel = useMemo(() => (tab === "empleado" ? "Empleado" : "Visitante"), [tab]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const close = () => {
    setError("");
    setTab("empleado");
    setEmp({ employeeId: "", pin: "" });
    setVis({ email: "", otp: "" });
    setGeneratedOtp("");
    onClose?.();
  };

  const onEmployeeSubmit = (e) => {
    e.preventDefault();
    setError("");
    const found = validateEmployee(emp);
    if (!found) {
      setError("Credenciales inválidas. Prueba 10001/1111 (mock).");
      return;
    }

    setAuth({
      kind: "empleado",
      ownerKey: `emp:${found.employeeId}`,
      label: `${found.name} (${found.employeeId})`,
      at: new Date().toISOString(),
    });
    close();
    navigate("/mis-incidencias");
  };

  const onSendOtp = (e) => {
    e.preventDefault();
    setError("");
    const email = vis.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Introduce un email válido.");
      return;
    }
    setGeneratedOtp(generateOtp6());
  };

  const onVisitorSubmit = (e) => {
    e.preventDefault();
    setError("");
    const email = vis.email.trim().toLowerCase();
    if (!generatedOtp) {
      setError("Primero pulsa “Enviar código (simulado)”.");
      return;
    }
    if (vis.otp.trim() !== generatedOtp) {
      setError("Código incorrecto.");
      return;
    }

    setAuth({
      kind: "visitante",
      ownerKey: `vis:${email}`,
      label: email,
      at: new Date().toISOString(),
    });
    close();
    navigate("/mis-incidencias");
  };

  return (
    <div
      className="access-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="access-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="access-header">
          <div>
            <h2 id={titleId}>Acceder</h2>
            <p>Simulado para el TFG. Elige {tabLabel.toLowerCase()}.</p>
          </div>
          <button className="access-close" type="button" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className="access-tabs" role="tablist" aria-label="Tipo de acceso">
          <button
            type="button"
            className={`access-tab ${tab === "empleado" ? "is-active" : ""}`}
            role="tab"
            id={employeeTabId}
            aria-selected={tab === "empleado"}
            aria-controls={`${employeeTabId}-panel`}
            onClick={() => {
              setError("");
              setTab("empleado");
            }}
          >
            Empleado
          </button>
          <button
            type="button"
            className={`access-tab ${tab === "visitante" ? "is-active" : ""}`}
            role="tab"
            id={visitorTabId}
            aria-selected={tab === "visitante"}
            aria-controls={`${visitorTabId}-panel`}
            onClick={() => {
              setError("");
              setTab("visitante");
            }}
          >
            Visitante
          </button>
        </div>

        {tab === "empleado" ? (
          <form
            className="access-form"
            onSubmit={onEmployeeSubmit}
            role="tabpanel"
            id={`${employeeTabId}-panel`}
            aria-labelledby={employeeTabId}
          >
            <div className="grid">
              <label>
                Nº empleado*
                <input
                  value={emp.employeeId}
                  onChange={(e) => setEmp((p) => ({ ...p, employeeId: e.target.value }))}
                  placeholder="Ej: 10001"
                  required
                  autoFocus
                />
              </label>
              <label>
                PIN*
                <input
                  value={emp.pin}
                  onChange={(e) => setEmp((p) => ({ ...p, pin: e.target.value }))}
                  placeholder="Ej: 1111"
                  type="password"
                  required
                />
              </label>
            </div>
            <div className="access-hint">Ejemplo (demo): 10001 / 1111</div>
            {error && <div className="access-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn secondary" onClick={close}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Entrar
              </button>
            </div>
          </form>
        ) : (
          <form
            className="access-form"
            onSubmit={onVisitorSubmit}
            role="tabpanel"
            id={`${visitorTabId}-panel`}
            aria-labelledby={visitorTabId}
          >
            <div className="grid">
              <label>
                Email*
                <input
                  value={vis.email}
                  onChange={(e) => setVis((p) => ({ ...p, email: e.target.value }))}
                  placeholder="visitante@ejemplo.com"
                  required
                  autoFocus
                />
              </label>
              <label>
                Código (OTP)*
                <input
                  value={vis.otp}
                  onChange={(e) => setVis((p) => ({ ...p, otp: e.target.value }))}
                  placeholder="6 dígitos"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  required
                />
              </label>
            </div>

            <div className="access-otp">
              <button type="button" className="btn secondary" onClick={onSendOtp}>
                Enviar código (simulado)
              </button>
              {generatedOtp && (
                <div className="access-otp-code">
                  Código simulado: <strong>{generatedOtp}</strong>
                </div>
              )}
            </div>

            {error && <div className="access-error">{error}</div>}
            <div className="actions">
              <button type="button" className="btn secondary" onClick={close}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Ver mis incidencias
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

