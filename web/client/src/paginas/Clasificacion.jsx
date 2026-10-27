import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Build, Cargando, Fallo, Seccion, Top, TagArquetipo, TagClase, colorRonda, hace, useDatos } from "../ui.jsx";
import { ARQUETIPOS, CLASES, MITICAS, duracion, fmt } from "../nombres.js";
import { Desplegable, Segmentos } from "../controles.jsx";

// Como zwr.gg: cada categoria tiene su tabla por numero de jugadores, y cada
// fila es una partida con todos sus jugadores.
const JUGADORES = [["1", "Solo"], ["2", "Dúo"], ["3", "Trío"], ["4", "Cuarteto"], ["5", "5+"]];
const reloj = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = Math.floor(s % 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`;
};
// valor: lo que se ordena (null = la partida no entra); mayor: si gana el mas alto.
const speedrun = (r) => ({
  t: r === "30" ? "Speedrun R30" : `R${r}`,
  columna: "Tiempo",
  explica: `Tiempo desde que empieza la partida hasta que empieza la ronda ${r}. Solo partidas desde la versión 1.10.3.`,
  valor: (p) => (p.validada !== false && p.hitos && p.hitos[r] !== undefined ? p.hitos[r] : null),
  mayor: false,
  texto: (v) => reloj(v),
});
const CATEGORIAS = {
  high: { t: "High Rounds", columna: "Ronda", explica: "La ronda más alta de cada jugador o grupo.", valor: (p) => p.ronda, mayor: true, texto: (v) => v, color: true },
  flawless: {
    t: "Flawless", columna: "Sin caer", explica: "Hasta qué ronda llegó el grupo sin que nadie cayera. Solo partidas desde la versión 1.10.3.",
    valor: (p) => (p.validada !== false && p.sin_caer !== null && p.sin_caer !== undefined ? p.sin_caer : null), mayor: true, texto: (v) => v, color: true,
  },
  30: speedrun("30"),
  50: speedrun("50"),
  100: speedrun("100"),
  200: speedrun("200"),
};
// Orden de las pestanas (un objeto pondria antes las claves numericas).
const ORDEN = ["high", "flawless", "30", "50", "100", "200"];
const RECORDS = [
  ["danio", "Daño en una partida", (f) => fmt(f.danio_total), (f) => f.danio_total],
  ["bajas", "Bajas en una partida", (f) => fmt(f.bajas), (f) => f.bajas],
  ["nivel", "Nivel alcanzado", (f) => f.nivel, (f) => f.nivel],
  ["cabezas", "Tiros a la cabeza", (f) => fmt(f.cabezas), (f) => f.cabezas],
  ["puntos", "Puntos ganados", (f) => fmt(f.puntos_total), (f) => f.puntos_total],
  ["reanimaciones", "Reanimaciones", (f) => f.reanimaciones, (f) => f.reanimaciones],
];

// La mejor partida de cada grupo de jugadores (en solo, de cada jugador) en la
// categoria. Los filtros de clase, arquetipo y mitica valen si algun jugador
// del grupo los cumple. A igual valor va primero quien llego antes.
function ranking(partidas, c, filtro) {
  const gana = (a, b) => (c.mayor ? a.valor > b.valor : a.valor < b.valor) || (a.valor === b.valor && a.p.fecha < b.p.fecha);
  const mejor = new Map();
  for (const p of partidas) {
    if (p.prueba) continue;
    const n = p.jugadores.length;
    if (filtro.tam === "5" ? n < 5 : n !== Number(filtro.tam)) continue;
    const cumple = p.jugadores.some((j) => (!filtro.clase || j.clase === filtro.clase) && (!filtro.arq || j.arquetipo === filtro.arq) && (!filtro.mitica || j.mitica === filtro.mitica));
    const valor = c.valor(p);
    if (!cumple || valor === null) continue;
    const e = { p, valor };
    const clave = p.jugadores.map((j) => j.nombre).sort().join("\n");
    const a = mejor.get(clave);
    if (!a || gana(e, a)) mejor.set(clave, e);
  }
  return [...mejor.values()].sort((a, b) => (gana(a, b) ? -1 : gana(b, a) ? 1 : 0));
}

// Puesto compartido, como en zwr.gg: mismo valor = mismo puesto y el siguiente
// se salta (1, 2, 4, 4, 6). El numero solo sale en la primera fila del empate.
function puestos(lista) {
  return lista.map((x, i) => {
    let p = i;
    while (p > 0 && lista[p - 1].valor === x.valor) p--;
    return { puesto: p + 1, ver: p === i };
  });
}

// Pulsar en cualquier sitio de la fila abre la partida; los enlaces de dentro
// (a cada jugador) siguen yendo a su sitio y seleccionar texto no navega.
const abrir = (ir, id) => (e) => {
  if (e.target.closest("a") || window.getSelection()?.toString()) return;
  ir(`/partida/${id}`);
};

export default function Clasificacion() {
  const ir = useNavigate();
  const runs = useDatos("/runs?limit=1000");
  const lb = useDatos("/leaderboards");
  // Categoria y jugadores en la URL (?c=flawless&j=2) para poder pasar el enlace.
  const [params, setParams] = useSearchParams();
  const cat = CATEGORIAS[params.get("c")] ? params.get("c") : "high";
  const tam = JUGADORES.some(([v]) => v === params.get("j")) ? params.get("j") : "1";
  const cambiar = (clave, v) => {
    const n = new URLSearchParams(params);
    n.set(clave, v);
    setParams(n, { replace: true });
  };
  const [clase, setClase] = useState("");
  const [arq, setArq] = useState("");
  const [mitica, setMitica] = useState("");
  const c = CATEGORIAS[cat];
  const filas = useMemo(() => (runs.datos ? ranking(runs.datos, c, { tam, clase, arq, mitica }) : []), [runs.datos, c, tam, clase, arq, mitica]);
  const pos = puestos(filas);
  const alta = cat === "high";

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Town · mejores partidas por número de jugadores</span>
          <h1>Clasificación</h1>
          <p className="mut">Una entrada por jugador o grupo con su mejor partida en cada categoría. Con el mismo resultado comparten puesto y va primero quien lo consiguió antes.</p>
        </div>
      </div>

      <div className="filtros">
        <Segmentos valor={cat} onCambio={(v) => cambiar("c", v)} opciones={ORDEN.map((id) => [id, CATEGORIAS[id].t])} ariaLabel="Categoría" />
      </div>
      <div className="filtros">
        <Segmentos valor={tam} onCambio={(v) => cambiar("j", v)} opciones={JUGADORES} ariaLabel="Jugadores en la partida" />
        <Desplegable valor={clase} onCambio={setClase} ariaLabel="Clase" opciones={[{ v: "", t: "Todas las clases" }, ...Object.entries(CLASES).map(([id, x]) => ({ v: id, t: x.nombre }))]} />
        <Desplegable valor={arq} onCambio={setArq} ariaLabel="Arquetipo" opciones={[{ v: "", t: "Todos los arquetipos" }, ...Object.entries(ARQUETIPOS).map(([id, a]) => ({ v: id, t: a.nombre }))]} />
        <Desplegable valor={mitica} onCambio={setMitica} ariaLabel="Mítica" opciones={[{ v: "", t: "Cualquier mítica" }, ...Object.entries(MITICAS).filter(([id]) => id !== "leaper").map(([id, n]) => ({ v: id, t: n }))]} />
      </div>
      <p className="mut peq" style={{ margin: "-4px 0 14px" }}>{c.explica}</p>

      {runs.cargando && <Cargando filas={5} />}
      {runs.error && <Fallo error={runs.error} />}
      {runs.datos && (filas.length ? (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th>{tam === "1" ? "Jugador" : "Jugadores"}</th>
                <th className="der">{c.columna}</th>
                <th>Build</th>
                <th className="der m-oculta">Nivel</th>
                <th className="der m-oculta">Bajas</th>
                <th className="der m-oculta">{alta ? "Duración" : "Ronda final"}</th>
                <th className="der m-oculta">Cuándo</th>
              </tr>
            </thead>
            {filas.map(({ p, valor }, i) => (
              <tbody key={p.id} className="equipo fila-clic" onClick={abrir(ir, p.id)} title="Ver la partida">
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
                    {k === 0 && (
                      <td className="der" rowSpan={p.jugadores.length}>
                        <Link to={`/partida/${p.id}`} className="grande num" style={c.color ? { color: colorRonda(valor) } : undefined}>{c.texto(valor)}</Link>
                        {p.dificultad_max > 0 && <div className="peq ten" title="Dificultad más alta del equipo (carta Maldición)">Dif. {p.dificultad_max} %</div>}
                      </td>
                    )}
                    <td className="c-build"><Build cartas={j.cartas} mitica={j.mitica} max={12} /></td>
                    <td className="der num m-oculta">{j.nivel}</td>
                    <td className="der num m-oculta">{fmt(j.bajas)}</td>
                    {k === 0 && <td className="der num ten m-oculta" rowSpan={p.jugadores.length}>{alta ? duracion(p.duracion_s) : p.ronda}</td>}
                    {k === 0 && <td className="der ten m-oculta" rowSpan={p.jugadores.length}>{hace(p.fecha)}</td>}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      ) : (
        <p className="vacio">Todavía no hay partidas en esta categoría con ese filtro.</p>
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
