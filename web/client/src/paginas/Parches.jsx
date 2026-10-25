import { useState } from "react";
import { ArrowRight } from "lucide-react";
import parches from "../parches.json";
import { Segmentos } from "../controles.jsx";

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
