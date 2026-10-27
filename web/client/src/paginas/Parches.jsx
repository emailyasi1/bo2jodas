import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Download, LogIn } from "lucide-react";
import parches from "../parches.json";
import { Segmentos } from "../controles.jsx";
import { infoDescarga } from "../api.js";
import { useSesion } from "../sesion.jsx";

// parches.json se escribe a mano con cada cambio que se sube a GitHub (lo mas
// nuevo arriba). "Web" en version = cambio solo de la pagina.

const TIPOS = {
  nuevo: { t: "Nuevo", c: "#f0882a" },
  buff: { t: "Buff", c: "#7fbf5a" },
  nerf: { t: "Nerf", c: "#e0503f" },
  rework: { t: "Rework", c: "#bf59ff" },
  arreglo: { t: "Arreglo", c: "#4d99ff" },
  cambio: { t: "Cambio", c: "#a39b90" },
  web: { t: "Web", c: "#33c2b0" },
};
const ORDEN = Object.keys(TIPOS);
const FILTRO = [["", "Todo"], ["mod", "Mod"], ["web", "Web"]];

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export default function Parches() {
  const [filtro, setFiltro] = useState("");
  const lista = parches.filter((p) => !filtro || (filtro === "web") === (p.version === "Web"));
  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Historial</span>
          <h1>Notas de parche</h1>
          <p className="mut">Cada cambio del mod y de la web, lo más nuevo arriba.</p>
        </div>
        <Descarga />
      </div>
      <div className="filtros">
        <Segmentos valor={filtro} onCambio={setFiltro} opciones={FILTRO} ariaLabel="Qué cambios" />
      </div>
      <div className="parches">
        {lista.map((p, i) => <Parche key={`${p.version}-${p.fecha}-${i}`} p={p} />)}
      </div>
    </>
  );
}

// Boton de descarga de la ultima version (el servidor redirige al zip de la
// release de GitHub; el repo es privado, por eso hace falta haber entrado).
function Descarga() {
  const { yo } = useSesion();
  const [info, setInfo] = useState(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!yo) return;
    infoDescarga().then(setInfo).catch((e) => setError(e.message));
  }, [yo]);

  if (yo === undefined) return null;
  if (!yo)
    return (
      <Link to="/entrar" className="boton sec"><LogIn size={16} />Entra para descargar el mod</Link>
    );
  if (error) return <span className="ten peq">No se pudo consultar la última versión: {error}</span>;
  if (info === null) return null;
  const mb = info ? ` · ${Math.round(info.tamano / 1048576)} MB` : "";
  return (
    <div style={{ textAlign: "right" }}>
      <a href="/api/descarga" className="boton"><Download size={16} />Descargar la última versión{info ? ` (${info.version})` : ""}</a>
      <div className="ten peq" style={{ marginTop: 6 }}>
        Zip de GitHub{mb}. Descomprímelo y copia la carpeta <code>zm_bo2jodas</code> en <code>%localappdata%\Plutonium\storage\t6\mods\</code>
      </div>
    </div>
  );
}

function Parche({ p }) {
  const web = p.version === "Web";
  const cambios = [...p.cambios].sort((a, b) => ORDEN.indexOf(a.tipo) - ORDEN.indexOf(b.tipo));
  return (
    <article className="panel parche" id={web ? undefined : `v${p.version}`}>
      <header className="parche-cab">
        <span className={web ? "parche-v parche-web" : "parche-v"}>{web ? "Web" : p.version}</span>
        <div>
          <h2>{p.titulo}</h2>
          <span className="ten peq">
            {p.fecha ? fecha(p.fecha) : "Antes del repositorio"}
            {p.pruebas && <> · <span className="tag tag-linea" style={{ "--c": "var(--lava)" }}>En pruebas</span></>}
          </span>
        </div>
      </header>
      <ul className="parche-lista">
        {cambios.map((c, i) => {
          const t = TIPOS[c.tipo] || TIPOS.cambio;
          return (
            <li key={i}>
              <span className="tag parche-tipo" style={{ "--c": t.c }}>{t.t}</span>
              <div>
                <b>{c.que}</b>
                {c.texto && <span className="mut"> {c.texto}</span>}
                {(c.antes || c.ahora) && (
                  <span className="parche-cambio">
                    {c.antes && <><s className="ten">{c.antes}</s><ArrowRight size={14} aria-label="pasa a" /></>}
                    <span>{c.ahora}</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
