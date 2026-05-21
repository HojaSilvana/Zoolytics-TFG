import "./App.css";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/NavegationBar";
import Contacto from "./pages/Contacto";
import Incidencias from "./pages/Incidencias";
import Inicio from "./pages/Inicio";
import MisIncidencias from "./pages/MisIncidencias";


function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/incidencias" element={<Incidencias />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/mis-incidencias" element={<MisIncidencias />} />
      </Routes>
    </>
  );
}
export default App;