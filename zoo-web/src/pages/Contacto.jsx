import "./Page.css";

const SERVICES = [
  { title: "Atención al visitante", desc: "Información, objetos perdidos, accesibilidad." },
  { title: "Mantenimiento", desc: "Averías, instalaciones, electricidad, fontanería." },
  { title: "Seguridad", desc: "Incidentes, emergencias, coordinación." },
  { title: "Veterinaria", desc: "Salud y bienestar animal, observaciones." },
  { title: "IT", desc: "Sistemas, dispositivos, red, soporte interno." },
];

export default function Contacto() {
  return (
    <main className="page">
      <header className="page-hero">
        <h1>Contacto</h1>
        <p>Canales y servicios disponibles para gestionar incidencias y consultas.</p>
      </header>

      <section className="page-grid">
        <div className="page-card">
          <h2>Datos generales</h2>
          <ul>
            <li>Teléfono: +34 000 000 000</li>
            <li>Email: contacto@zoo.example</li>
            <li>Horario: 09:00 – 19:00</li>
          </ul>
        </div>
        <div className="page-card">
          <h2>Emergencias</h2>
          <p>Si es una urgencia real, contacta con seguridad y activa el protocolo interno.</p>
        </div>
      </section>

      <section className="page-card">
        <h2>Servicios</h2>
        <div className="services">
          {SERVICES.map((s) => (
            <div key={s.title} className="service">
              <div className="service-title">{s.title}</div>
              <div className="service-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

