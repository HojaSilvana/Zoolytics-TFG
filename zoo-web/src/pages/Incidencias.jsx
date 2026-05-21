import "./Page.css";

export default function Incidencias() {
  return (
    <main className="page">
      <header className="page-hero">
        <h1>Política de incidencias</h1>
        <p>
          Esta sección describe cómo se registran, priorizan y asignan las incidencias del
          zoológico.
        </p>
      </header>

      <section className="page-card">
        <h2>Tipos</h2>
        <ul>
          <li>Mantenimiento (instalaciones, fugas, averías)</li>
          <li>Seguridad (riesgos, objetos perdidos, emergencias)</li>
          <li>Veterinaria (salud animal, observaciones, bienestar)</li>
          <li>Limpieza (zonas, residuos, higiene)</li>
          <li>IT (sistemas, dispositivos, red)</li>
        </ul>
      </section>

      <section className="page-grid">
        <div className="page-card">
          <h2>Prioridad</h2>
          <p>
            La urgencia ayuda a asignar recursos. “Crítica” implica atención inmediata y puede
            activar avisos automáticos.
          </p>
        </div>
        <div className="page-card">
          <h2>Estados</h2>
          <p>Nueva → En curso → En espera → Resuelta → Cerrada.</p>
        </div>
      </section>

      <section className="page-card">
        <h2>Asignación</h2>
        <p>
          El departamento IT revisa la incidencia, la clasifica y la asigna al departamento
          responsable. Se envían notificaciones por email y queda registro del seguimiento.
        </p>
      </section>
    </main>
  );
}

