import { useEffect } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Home, Trophy, ScrollText, Users, Calculator, Upload, User, LogIn, RotateCcw, BookOpen, Newspaper } from "lucide-react";
import Inicio from "./paginas/Inicio.jsx";
import Partidas from "./paginas/Partidas.jsx";
import Partida from "./paginas/Partida.jsx";
import Resets from "./paginas/Resets.jsx";
import Clasificacion from "./paginas/Clasificacion.jsx";
import Jugadores from "./paginas/Jugadores.jsx";
import Jugador from "./paginas/Jugador.jsx";
import Subir from "./paginas/Subir.jsx";
import Entrar from "./paginas/Entrar.jsx";
import Perfil from "./paginas/Perfil.jsx";
import Calculadora from "./paginas/Calculadora.jsx";
import Wiki from "./paginas/Wiki.jsx";
import Parches from "./paginas/Parches.jsx";
import { ProveedorSesion, useSesion } from "./sesion.jsx";
import { iniciarAutosubida } from "./autosubida.js";

const NAV = [
  { a: "/", t: "Inicio", i: Home, end: true },
  { a: "/clasificacion", t: "Clasificación", i: Trophy },
  { a: "/partidas", t: "Partidas", i: ScrollText },
  { a: "/resets", t: "Resets", i: RotateCcw },
  { a: "/jugadores", t: "Jugadores", i: Users },
  { a: "/calculadora", t: "Calculadora", i: Calculator },
  { a: "/wiki", t: "Wiki", i: BookOpen },
  { a: "/parches", t: "Parches", i: Newspaper },
  { a: "/subir", t: "Subir partida", i: Upload },
];

function Barra() {
  const { yo } = useSesion();
  return (
    <header className="barra">
      <div className="contenedor">
        <Link to="/" className="marca" aria-label="bo2jodas, inicio">
          <span className="marca-bo2">BO2</span>JODAS
          <span className="marca-sub">Town · Plutonium</span>
        </Link>
        <nav className="nav" aria-label="Secciones">
          {NAV.map(({ a, t, i: Icono, end }) => (
            <NavLink key={a} to={a} end={end} title={t}>
              <Icono size={16} strokeWidth={2} />
              <span>{t}</span>
            </NavLink>
          ))}
        </nav>
        <div className="barra-derecha">
          {yo ? (
            <Link to="/perfil" className="cuenta" title={yo.usuario}><User size={15} /><span>{yo.usuario}</span></Link>
          ) : yo === null ? (
            <Link to="/entrar" className="cuenta" title="Entrar"><LogIn size={15} /><span>Entrar</span></Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

// Con sesion, la autosubida vigila la carpeta elegida desde cualquier pagina.
function Autosubir() {
  const { yo } = useSesion();
  useEffect(() => iniciarAutosubida(!!yo), [yo]);
  return null;
}

function ArribaAlCambiar() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ProveedorSesion>
      <div className="app">
        <ArribaAlCambiar />
        <Autosubir />
        <Barra />
        <main>
          <div className="contenedor">
            <Routes>
              <Route path="/" element={<Inicio />} />
              <Route path="/clasificacion" element={<Clasificacion />} />
              <Route path="/leaderboards" element={<Navigate to="/clasificacion" replace />} />
              <Route path="/partidas" element={<Partidas />} />
              <Route path="/partida/:id" element={<Partida />} />
              <Route path="/resets" element={<Resets />} />
              <Route path="/wiki" element={<Wiki />} />
              <Route path="/parches" element={<Parches />} />
              <Route path="/jugadores" element={<Jugadores />} />
              <Route path="/jugador/:nombre" element={<Jugador />} />
              <Route path="/calculadora" element={<Calculadora />} />
              <Route path="/subir" element={<Subir />} />
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/registro" element={<Entrar registro />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="*" element={<NoExiste />} />
            </Routes>
          </div>
        </main>
        <footer className="pie">
          <div className="contenedor">
            <span>bo2jodas · mod de Black Ops II Zombies para Plutonium T6. Las partidas las escribe el propio mod al acabar.</span>
            <a href="https://github.com/emailyasi0-a11y/bo2jodas" target="_blank" rel="noreferrer">Código y descargas en GitHub</a>
          </div>
        </footer>
      </div>
    </ProveedorSesion>
  );
}

function NoExiste() {
  return (
    <div className="pagina-cab">
      <div>
        <h1>Aquí no hay nada</h1>
        <p className="mut">Esta página no existe. <Link to="/" style={{ color: "var(--lava)" }}>Volver al inicio</Link>.</p>
      </div>
    </div>
  );
}
