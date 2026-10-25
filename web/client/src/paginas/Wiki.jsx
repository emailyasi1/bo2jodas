import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import cartasJson from "../cartas.json";
import wiki from "../wiki.json";
import { ARQUETIPOS, RAREZAS, carta, colorArquetipo } from "../nombres.js";
import { Ficha, TagArquetipo, valorCarta } from "../ui.jsx";
import { Desplegable, Segmentos } from "../controles.jsx";
import { Markdown, enLinea } from "../md.jsx";

// Los textos salen del README (tools/generar_wiki_web.py) y los numeros del
// mod (cartas.json): la wiki se actualiza sola al regenerarlos.

const NOMBRES_RAREZA = [["COMUN", "Común"], ["POCO COMUN", "Poco común"], ["RARA", "Rara"], ["EPICA", "Épica"], ["LEGENDARIA", "Legendaria"]];
const TIPOS = [["", "Todas"], ["general", "Generales"], ["arquetipo", "De arquetipo"], ["especial", "Equipo y power-ups"], ["mitica", "Míticas"]];

const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function grupoDe(c) {
  if (c.tipo === "mitica") return "mitica";
  if (c.tipo !== "normal") return "especial";
  return c.arquetipo ? "arquetipo" : "general";
}

const CARTAS = cartasJson.map((c) => ({ ...carta(c.id), efecto: wiki.cartas[c.id] || "", grupo: grupoDe(c) }));

export default function Wiki() {
  const [params, setParams] = useSearchParams();
  const seccion = params.get("s") || "cartas";
  const indice = [{ id: "cartas", titulo: "Cartas" }, ...wiki.secciones];
  const actual = wiki.secciones.find((s) => s.id === seccion);
  const ir = (id) => {
    setParams(id === "cartas" ? {} : { s: id });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Cómo funciona el mod</span>
          <h1>Wiki</h1>
          <p className="mut">Qué hace cada carta, con sus valores por rareza y su tope, y todas las reglas del mod. Se actualiza con cada versión.</p>
        </div>
      </div>
      <div className="wiki">
        <nav className="wiki-indice" aria-label="Secciones de la wiki">
          {indice.map((s) => (
            <button key={s.id} type="button" className={s.id === seccion ? "activo" : ""} aria-current={s.id === seccion ? "page" : undefined} onClick={() => ir(s.id)}>
              {s.titulo}
            </button>
          ))}
        </nav>
        <div className="wiki-cuerpo">
          {actual ? (
            <article>
              <h2 className="wiki-h2">{actual.titulo}</h2>
              <Markdown texto={actual.md} />
            </article>
          ) : <Cartas />}
        </div>
      </div>
    </>
  );
}

function Cartas() {
  const [tipo, setTipo] = useState("");
  const [arq, setArq] = useState("");
  const [buscar, setBuscar] = useState("");

  const lista = useMemo(() => {
    const q = sinTildes(buscar.trim());
    return CARTAS.filter((c) => {
      if (tipo && c.grupo !== tipo) return false;
      if (arq && c.arquetipo !== arq) return false;
      return !q || sinTildes(`${c.nombre} ${c.efecto}`).includes(q);
    });
  }, [tipo, arq, buscar]);

  // Generales, luego cada arquetipo (en el orden de nombres.js), especiales y miticas.
  const grupos = [
    { id: "general", titulo: "Cartas generales", cartas: lista.filter((c) => c.grupo === "general") },
    ...Object.keys(ARQUETIPOS).map((a) => ({ id: a, arq: a, cartas: lista.filter((c) => c.grupo === "arquetipo" && c.arquetipo === a) })),
    { id: "especial", titulo: "Equipo, power-ups y Pack-a-Punch", cartas: lista.filter((c) => c.grupo === "especial") },
    { id: "mitica", titulo: "Míticas", cartas: lista.filter((c) => c.grupo === "mitica") },
  ].filter((g) => g.cartas.length);

  return (
    <>
      <div className="filtros">
        <Segmentos valor={tipo} onCambio={setTipo} opciones={TIPOS} ariaLabel="Tipo de carta" />
        <Desplegable valor={arq} onCambio={setArq} ariaLabel="Arquetipo" opciones={[{ v: "", t: "Todos los arquetipos" }, ...Object.entries(ARQUETIPOS).map(([id, a]) => ({ v: id, t: a.nombre }))]} />
        <label className="buscador">
          <Search size={15} />
          <input className="entrada" placeholder="Buscar carta o efecto" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </label>
      </div>
      <div className="wiki-leyenda">
        {NOMBRES_RAREZA.map(([id, n]) => <span key={id} className="tag tag-linea" style={{ "--c": RAREZAS[id] }}>{n}</span>)}
        <span className="ten peq">Valores de cada carta según la rareza con la que sale. Se acumulan hasta el tope.</span>
      </div>
      {grupos.length ? grupos.map((g) => (
        <section key={g.id} className="wiki-grupo">
          <div className="grupo-titulo">
            {g.arq ? <TagArquetipo id={g.arq} /> : <h3 className="wiki-h3">{g.titulo}</h3>}
            {g.arq && wiki.arquetipos[g.arq] && <span className="mut peq">{enLinea(wiki.arquetipos[g.arq])}</span>}
          </div>
          <div className="wiki-cartas">
            {g.cartas.map((c) => <FichaWiki key={c.id} c={c} />)}
          </div>
        </section>
      )) : <p className="vacio">Ninguna carta con ese filtro.</p>}
    </>
  );
}

function FichaWiki({ c }) {
  const variable = new Set(c.valores).size > 1;
  const conTope = !c.firma && (c.tipo === "normal" || c.tipo === "equipo") && c.tope > 0;
  return (
    <article className="wiki-carta" id={`carta-${c.id}`} style={c.arquetipo ? { "--c": colorArquetipo(c.arquetipo) } : undefined}>
      <div className="wc-cab">
        <Ficha id={c.id} mitica={c.tipo === "mitica"} grande />
        <div className="wc-nombre">
          <b>{c.nombre}</b>
          <span className="wc-tags">
            {c.firma && <span className="tag" style={{ "--c": colorArquetipo(c.arquetipo) }}>Firma</span>}
            {c.tipo === "mitica" && <span className="tag" style={{ "--c": RAREZAS.MITICA }}>Mítica</span>}
            {c.tipo === "equipo" && <span className="tag tag-linea">Equipo · no ocupa hueco</span>}
            {c.tipo === "powerup" && <span className="tag tag-linea">Power-up · no ocupa hueco</span>}
            {c.tipo === "instantanea" && <span className="tag tag-linea">No ocupa hueco</span>}
          </span>
        </div>
      </div>
      {c.efecto && <p className="wc-efecto">{enLinea(c.efecto)}</p>}
      {(variable || conTope) && (
        <div className="wc-valores">
          {variable && NOMBRES_RAREZA.map(([id, n], i) => (
            <span key={id} className="wc-valor" style={{ "--c": RAREZAS[id] }} title={n}>{valorCarta(c.id, c.valores[i])}</span>
          ))}
          {conTope && <span className="wc-tope">Tope <b>{valorCarta(c.id, c.tope)}</b></span>}
        </div>
      )}
    </article>
  );
}
