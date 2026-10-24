import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Build, Cargando, Fallo, Seccion, Top, TagArquetipo, TagClase, colorRonda, grupo, hace, useDatos } from "../ui.jsx";
import { ARQUETIPOS, CLASES, MITICAS, duracion, fmt } from "../nombres.js";

const TAMANO = [["", "Todos"], ["1", "Solo"], ["2", "Dúo"], ["3", "Trío"], ["4", "Cuarteto"], ["5", "5+"]];
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
        <div className="segmentos" role="group" aria-label="Tamaño del grupo">
          {TAMANO.map(([v, t]) => <button key={v} type="button" aria-pressed={tam === v} onClick={() => setTam(v)}>{t}</button>)}
        </div>
        <select className="select" value={clase} onChange={(e) => setClase(e.target.value)} aria-label="Clase">
          <option value="">Todas las clases</option>
          {Object.entries(CLASES).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}
        </select>
        <select className="select" value={arq} onChange={(e) => setArq(e.target.value)} aria-label="Arquetipo">
          <option value="">Todos los arquetipos</option>
          {Object.entries(ARQUETIPOS).map(([id, a]) => <option key={id} value={id}>{a.nombre}</option>)}
        </select>
        <select className="select" value={mitica} onChange={(e) => setMitica(e.target.value)} aria-label="Mítica">
          <option value="">Cualquier mítica</option>
          {Object.entries(MITICAS).filter(([id]) => id !== "leaper").map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </select>
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
