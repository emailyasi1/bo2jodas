import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Build, Cargando, Fallo, Seccion, Top, TagArquetipo, TagClase, colorRonda, grupo, hace, useDatos } from "../ui.jsx";
import { ARQUETIPOS, CLASES, MITICAS, duracion, fmt } from "../nombres.js";
import { Desplegable, Segmentos } from "../controles.jsx";

const TAMANO = [["", "Todos"], ["1", "Solo"], ["2", "Dúo"], ["3", "Trío"], ["4", "Cuarteto"], ["5", "5+"]];
// Categorias: High Rounds (la tabla de siempre), Flawless y speedruns.
const CATEGORIAS = [["high", "High Rounds"], ["flawless", "Flawless"], ["30", "Speedrun R30"], ["50", "R50"], ["100", "R100"], ["200", "R200"]];
const reloj = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = Math.floor(s % 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`;
};
const RECORDS = [
  ["danio", "Daño en una partida", (f) => fmt(f.danio_total), (f) => f.danio_total],
  ["bajas", "Bajas en una partida", (f) => fmt(f.bajas), (f) => f.bajas],
  ["nivel", "Nivel alcanzado", (f) => f.nivel, (f) => f.nivel],
  ["cabezas", "Tiros a la cabeza", (f) => fmt(f.cabezas), (f) => f.cabezas],
  ["puntos", "Puntos ganados", (f) => fmt(f.puntos_total), (f) => f.puntos_total],
  ["reanimaciones", "Reanimaciones", (f) => f.reanimaciones, (f) => f.reanimaciones],
];

// Una entrada por jugador y partida, y nos quedamos con la mejor de cada jugador.
function ranking(partidas, filtro) {
  const mejor = new Map();
  for (const p of partidas) {
    if (p.prueba) continue;
    const n = p.jugadores.length;
    if (filtro.tam && (filtro.tam === "5" ? n < 5 : n !== Number(filtro.tam))) continue;
    for (const j of p.jugadores) {
      if (filtro.clase && j.clase !== filtro.clase) continue;
      if (filtro.arq && j.arquetipo !== filtro.arq) continue;
      if (filtro.mitica && j.mitica !== filtro.mitica) continue;
      const e = { ...j, partida: p.id, ronda: p.ronda, fecha: p.fecha, duracion_s: p.duracion_s, n, companeros: p.jugadores.filter((x) => x !== j).map((x) => x.nombre) };
      const a = mejor.get(j.nombre);
      if (!a || e.ronda > a.ronda || (e.ronda === a.ronda && e.fecha < a.fecha)) mejor.set(j.nombre, e);
    }
  }
  return [...mejor.values()].sort((a, b) => b.ronda - a.ronda || (a.fecha < b.fecha ? -1 : 1));
}

export default function Clasificacion() {
  const runs = useDatos("/runs?limit=1000");
  const lb = useDatos("/leaderboards");
  const [tam, setTam] = useState("");
  const [clase, setClase] = useState("");
  const [arq, setArq] = useState("");
  const [mitica, setMitica] = useState("");
  const [cat, setCat] = useState("high");
  const filas = useMemo(() => (runs.datos ? ranking(runs.datos, { tam, clase, arq, mitica }) : []), [runs.datos, tam, clase, arq, mitica]);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Town · mejor ronda de cada jugador</span>
          <h1>Clasificación</h1>
          <p className="mut">Una línea por jugador con su mejor partida para el filtro elegido. A igual ronda, va primero quien llegó antes.</p>
        </div>
      </div>

      <div className="filtros">
        <Segmentos valor={cat} onCambio={setCat} opciones={CATEGORIAS} ariaLabel="Categoría" />
      </div>

      {cat !== "high" && <TablaPartidas lb={lb} cat={cat} />}

      {cat === "high" && <>
      <div className="filtros">
        <Segmentos valor={tam} onCambio={setTam} opciones={TAMANO} ariaLabel="Tamaño del grupo" />
        <Desplegable valor={clase} onCambio={setClase} ariaLabel="Clase" opciones={[{ v: "", t: "Todas las clases" }, ...Object.entries(CLASES).map(([id, c]) => ({ v: id, t: c.nombre }))]} />
        <Desplegable valor={arq} onCambio={setArq} ariaLabel="Arquetipo" opciones={[{ v: "", t: "Todos los arquetipos" }, ...Object.entries(ARQUETIPOS).map(([id, a]) => ({ v: id, t: a.nombre }))]} />
        <Desplegable valor={mitica} onCambio={setMitica} ariaLabel="Mítica" opciones={[{ v: "", t: "Cualquier mítica" }, ...Object.entries(MITICAS).filter(([id]) => id !== "leaper").map(([id, n]) => ({ v: id, t: n }))]} />
      </div>

      {runs.cargando && <Cargando filas={5} />}
      {runs.error && <Fallo error={runs.error} />}
      {runs.datos && (filas.length ? (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th>Jugador</th>
                <th className="der">Ronda</th>
                <th>Build</th>
                <th className="der m-oculta">Nivel</th>
                <th className="der m-oculta">Bajas</th>
                <th className="der m-oculta">Duración</th>
                <th className="der m-oculta">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.nombre} className={i < 3 ? `p${i + 1}` : ""}>
                  <td className="pos">{i + 1}</td>
                  <td>
                    <div className="celda-jugador">
                      <Link to={`/jugador/${encodeURIComponent(f.nombre)}`} className="nombre">{f.nombre}</Link>
                      <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <TagClase id={f.clase} />
                        <TagArquetipo id={f.arquetipo} />
                      </span>
                    </div>
                  </td>
                  <td className="der"><Link to={`/partida/${f.partida}`} className="grande" style={{ color: colorRonda(f.ronda) }}>{f.ronda}</Link></td>
                  <td className="c-build"><Build cartas={f.cartas} mitica={f.mitica} max={12} /></td>
                  <td className="der num m-oculta">{f.nivel}</td>
                  <td className="der num m-oculta">{fmt(f.bajas)}</td>
                  <td className="der num ten m-oculta">{duracion(f.duracion_s)}</td>
                  <td className="der ten m-oculta" title={f.companeros.length ? `Con ${f.companeros.join(", ")}` : "Solo"}>{[grupo(f.n), hace(f.fecha)].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="vacio">Nadie ha jugado todavía con esa combinación.</p>
      ))}
      </>}

      <div className="rejilla" style={{ marginTop: 36 }}>
        <Seccion titulo="Récords por partida">
          {lb.datos ? (
            <div className="rejilla-2" style={{ gap: 14 }}>
              {RECORDS.map(([id, t, txt, val]) => (
                <Top key={id} titulo={t} filas={lb.datos.records[id] || []} valor={val} texto={txt} enlace={(f) => `/partida/${f.partida}`} />
              ))}
            </div>
          ) : lb.error ? <Fallo error={lb.error} /> : <Cargando filas={3} />}
        </Seccion>
        <Seccion titulo="Historia del récord">
          {lb.datos && (lb.datos.historia.length ? (
            <div className="panel">
              <ol className="linea-tiempo" style={{ paddingTop: 12 }}>
                {lb.datos.historia.map((h) => (
                  <li key={h.partida + h.ronda}>
                    <div className="lt-cab">
                      <Link to={`/partida/${h.partida}`}><b style={{ color: colorRonda(h.ronda) }}>Ronda {h.ronda}</b></Link>
                      <span className="lt-sub">{hace(h.fecha)}</span>
                    </div>
                    <div className="lt-sub">
                      {h.nuevos.join(", ")}
                      {h.anterior > 0 ? ` supera la ${h.anterior}${h.anteriores.length ? ` de ${h.anteriores.join(", ")}` : ""}` : " abre el marcador"}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ) : <p className="vacio">Sin récords todavía.</p>)}
        </Seccion>
      </div>
    </>
  );
}

// Flawless (ronda alcanzada sin que nadie cayera) y speedrun (tiempo hasta
// empezar la ronda 30, 50, 100 o 200): una fila por partida.
function TablaPartidas({ lb, cat }) {
  if (lb.error) return <Fallo error={lb.error} />;
  if (!lb.datos) return <Cargando filas={4} />;
  const flawless = cat === "flawless";
  const filas = flawless ? lb.datos.flawless || [] : (lb.datos.speedrun || {})[cat] || [];
  return (
    <>
      <p className="mut" style={{ marginBottom: 14 }}>
        {flawless
          ? "Hasta qué ronda llegó el grupo sin que nadie cayera. Solo partidas desde la versión 1.10.3."
          : `Tiempo desde el inicio hasta que empieza la ronda ${cat}. Solo partidas desde la versión 1.10.3.`}
      </p>
      {filas.length ? (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th>Jugadores</th>
                <th className="der">{flawless ? "Ronda sin caer" : "Tiempo"}</th>
                <th className="der m-oculta">Ronda final</th>
                <th className="der m-oculta">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={f.partida} className={i < 3 ? `p${i + 1}` : ""}>
                  <td className="pos">{i + 1}</td>
                  <td>
                    {f.jugadores.map((n, k) => (
                      <span key={n}>{k > 0 && ", "}<Link to={`/jugador/${encodeURIComponent(n)}`} className="nombre">{n}</Link></span>
                    ))}
                  </td>
                  <td className="der">
                    <Link to={`/partida/${f.partida}`} className="grande" style={flawless ? { color: colorRonda(f.valor) } : undefined}>{flawless ? f.valor : reloj(f.valor)}</Link>
                  </td>
                  <td className="der num m-oculta">{f.ronda}</td>
                  <td className="der ten m-oculta">{[grupo(f.jugadores_n), hace(f.fecha)].filter(Boolean).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="vacio">Todavía no hay partidas en esta categoría.</p>}
    </>
  );
}
