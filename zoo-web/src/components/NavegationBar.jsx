import "./NavegationBar.css";
import logo from "../assets/logo.png";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import AccessModal from "./AccessModal";

export default function NavegationBar() {
  const [accessOpen, setAccessOpen] = useState(false);
  return (
    <>
      <nav className="navbar">
        <div className="logo">
          <img src={logo} alt="logo" />
          <div className="brand">
            <span className="brand-top">BIOPARK</span>
            <span className="brand-bottom">
              <span className="brand-initial">R</span>ío{" "}
              <span className="brand-initial">V</span>erde
            </span>
          </div>
        </div>

      <ul>
        <li>
          <NavLink to="/" end className="nav-link">
            Inicio
          </NavLink>
        </li>
        <li>
          <NavLink to="/incidencias" className="nav-link">
            Incidencias
          </NavLink>
        </li>
        <li>
          <NavLink to="/contacto" className="nav-link">
            Contacto
          </NavLink>
        </li>
      </ul>

        <button className="nav-btn" type="button" onClick={() => setAccessOpen(true)}>
          Acceder
        </button>
      </nav>

      <AccessModal open={accessOpen} onClose={() => setAccessOpen(false)} />
    </>
  );
}