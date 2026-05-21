import { useEffect, useMemo, useRef, useState } from "react";
import "./Hero.css";
import IncidentModal from "./IncidentModal";

export default function Hero() {

  const videos = useMemo(
    () => ["/videos/zoo.mp4", "/videos/lobo.mp4", "/videos/tigre.mp4", "/videos/elefante.mp4"],
    []
  );

  const INTERVAL_MS = 8000;

  const videoARef = useRef(null);
  const videoBRef = useRef(null);
  const pendingSwapRef = useRef(false);

  const [activeSlot, setActiveSlot] = useState(0); // 0 => A visible, 1 => B visible
  const [slotIndex, setSlotIndex] = useState(() => [
    0,
    videos.length > 1 ? 1 : 0,
  ]);

  const [incidentRole, setIncidentRole] = useState(null); // "empleado" | "visitante" | null

  useEffect(() => {
    if (videos.length <= 1) return;

    const interval = window.setInterval(() => {
      if (pendingSwapRef.current) return;
      pendingSwapRef.current = true;

      const inactiveSlot = activeSlot === 0 ? 1 : 0;
      const currentIdx = slotIndex[activeSlot];
      const nextIdx = (currentIdx + 1) % videos.length;

      setSlotIndex((prev) => {
        const next = [...prev];
        next[inactiveSlot] = nextIdx;
        return next;
      });

      const inactiveEl = inactiveSlot === 0 ? videoARef.current : videoBRef.current;
      if (!inactiveEl) {
        pendingSwapRef.current = false;
        return;
      }

      const onReady = () => {
        inactiveEl.removeEventListener("canplaythrough", onReady);
        setActiveSlot(inactiveSlot);
        pendingSwapRef.current = false;
      };

      inactiveEl.addEventListener("canplaythrough", onReady);
      inactiveEl.load();

      const playPromise = inactiveEl.play();
      if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
    }, INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [activeSlot, slotIndex, videos]);

  return (
    <section className="hero">

      <div className="video-stack" aria-hidden="true">
        <video
          ref={videoARef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`video-bg ${activeSlot === 0 ? "is-active" : ""}`}
        >
          <source src={videos[slotIndex[0]]} type="video/mp4" />
        </video>

        <video
          ref={videoBRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className={`video-bg ${activeSlot === 1 ? "is-active" : ""}`}
        >
          <source src={videos[slotIndex[1]]} type="video/mp4" />
        </video>
      </div>

      <div className="overlay"></div>

      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-kicker">Sistema de</span>
          <span className="hero-headline">
            <span className="hero-highlight">Incidencias</span>
          </span>
          <span className="hero-subheadline">
            <span className="hero-park">Biopark</span>{" "}
            <span className="hero-rio">
              <span className="brand-initial">R</span>ío{" "}
              <span className="brand-initial">V</span>erde
            </span>
          </span>
        </h1>

        <p>
          Ellos confían en ti y te abren las puertas de su hogar para tu mayor comodidad. Ayúdalos
          a mejorar.
        </p>

        <div className="buttons">
          <button
            className="btn primary"
            type="button"
            onClick={() => setIncidentRole("empleado")}
          >
            Empleado
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setIncidentRole("visitante")}
          >
            Visitante
          </button>
        </div>
      </div>

      <IncidentModal
        open={incidentRole !== null}
        role={incidentRole}
        onClose={() => setIncidentRole(null)}
      />

    </section>
  );
}