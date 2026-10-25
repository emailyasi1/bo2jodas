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

// Una entrada por grupo de jugadores (en solo, por jugador) con su mejor
// partida: en duo la fila es la partida con los dos. Los filtros de clase,
// arquetipo y mitica valen si algun jugador del grupo los cumple.
function ranking(partidas, filtro) {
  const mejor = new Map();
  for (const p of partidas) {
    if (p.prueba) continue;
    const n = p.jugadores.length;
    if (filtro.tam && (filtro.tam === "5" ? n < 5 : n !== Number(filtro.tam))) continue;
    const cumple = p.jugadores.some((j) => (!filtro.clase || j.clase === filtro.clase) && (!filtro.arq || j.arquetipo === filtro.arq) && (!filtro.mitica || j.mitica === filtro.mitica));
    if (!cumple) continue;
    const clave = p.jugadores.map((j) => j.nombre).sort().join("\n");
    const a = mejor.get(clave);
    if (!a || p.ronda > a.ronda || (p.ronda === a.ronda && p.fecha < a.fecha)) mejor.set(clave, p);
  }
  return [...mejor.values()].sort((a, b) => b.ronda - a.ronda || (a.fecha < b.fecha ? -1 : 1));
}

// Puesto compartido, como en zwr.gg: mismo valor = mismo puesto y el siguiente
// se salta (1, 2, 4, 4, 6). El numero solo sale en la primera fila del empate.
function puestos(lista, valor) {
  return lista.map((x, i) => {
    let p = i;
    while (p > 0 && valor(lista[p - 1]) === valor(x)) p--;
    return { puesto: p + 1, ver: p === i };
  });
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
  const pos = puestos(filas, (p) => p.ronda);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Town · mejor ronda de cada jugador o grupo</span>
          <h1>Clasificación</h1>
          <p className="mut">Una entrada por jugador (o por grupo, en Dúo, Trío...) con su mejor partida para el filtro elegido. A igual ronda, va primero quien llegó antes.</p>
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
                <th>Jugadores</th>
                <th className="der">Ronda</th>
                <th>Build</th>
                <th className="der m-oculta">Nivel</th>
                <th className="der m-oculta">Bajas</th>
                <th className="der m-oculta">Duración</th>
                <th className="der m-oculta">Cuándo</th>
              </tr>
            </thead>
            {filas.map((p, i) => (
              <tbody key={p.id} className="equipo">
                {p.jugadores.map((j, k) => (
                  <tr key={j.nombre} className={k === 0 && pos[i].puesto <= 3 ? `p${pos[i].puesto}` : ""}>
                    {k === 0 && <td className="pos" rowSpan={p.jugadores.length}>{pos[i].ver && pos[i].puesto}</td>}
                    <td>
                      <div className="celda-jugador">
                        <Link to={`/jugador/${encodeURIComponent(j.nombre)}`} className="nombre">{j.nombre}</Link>
                        <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <TagClase id={j.clase} />
                          <TagArquetipo id={j.arquetipo} />
                        </span>
                      </div>
                    </td>
                    {k === 0 && <td className="der" rowSpan={p.jugadores.length}><Link to={`/partida/${p.id}`} className="grande" style={{ color: colorRonda(p.ronda) }}>{p.ronda}</Link></td>}
                    <td className="c-build"><Build cartas={j.cartas} mitica={j.mitica} max={12} /></td>
                    <td className="der num m-oculta">{j.nivel}</td>
                    <td className="der num m-oculta">{fmt(j.bajas)}</td>
                    {k === 0 && <td className="der num ten m-oculta" rowSpan={p.jugadores.length}>{duracion(p.duracion_s)}</td>}
                    {k === 0 && <td className="der ten m-oculta" rowSpan={p.jugadores.length}>{[grupo(p.jugadores.length), hace(p.fecha)].filter(Boolean).join(" · ")}</td>}
                  </tr>
                ))}
              </tbody>
            ))}
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
  const pos = puestos(filas, (f) => f.valor);
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
                <tr key={f.partida} className={pos[i].puesto <= 3 ? `p${pos[i].puesto}` : ""}>
                  <td className="pos">{pos[i].ver && pos[i].puesto}</td>
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
