import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ChevronRight, Clock, Tag, Trash2, Upload, Users } from "lucide-react";
import {
  Cargando, Fallo, Ficha, FilaBarra, Ronda, Seccion, TagArquetipo, TagClase, TagMitica, grupo, useDatos, valorCarta, vaciarCache,
} from "../ui.jsx";
import { borrarPartida } from "../api.js";
import { COLORES_JUGADOR, ColumnasRondas, GraficaRondas } from "../graficas.jsx";
import { Segmentos } from "../controles.jsx";
import { useSesion } from "../sesion.jsx";
import { ARQUETIPOS, RAREZAS, carta, colorArquetipo, duracion, fecha, fmt, nombreArma, nombreBebida, nombreCarta, nombreMapa } from "../nombres.js";

const JEFES = { brutus: "Brutus", bruja: "Bruja", leroy: "Leroy" };
const RAREZA_TXT = { COMUN: "Común", "POCO COMUN": "Poco común", RARA: "Rara", EPICA: "Épica", LEGENDARIA: "Legendaria", MITICA: "Mítica" };
const pct = (a, b) => (b > 0 ? `${((100 * a) / b).toFixed(a / b >= 0.1 ? 0 : 1)} %` : "");
const CAUSAS = { zombie: "Zombie", tanque: "Tanque", brutus: "Brutus", bruja: "Bruja", leroy: "Leroy", caida: "Caída", fuego: "Fuego / lava", propio: "Explosión propia", explosion: "Explosión", otro: "Otro" };
const TECNICO = { max_vivos: "Zombies vivos a la vez (máx.)", atascos_recolocados: "Zombies atascados recolocados", atascos_muertos: "Zombies atascados eliminados", limpiezas_textos: "Limpiezas de textos" };
const TORRETA = { colocadas: "Colocadas", bajas: "Bajas", roturas: "Roturas", reparaciones: "Reparaciones", morteros: "Morteros", rebotes: "Rebotes" };
const reloj = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = Math.floor(s % 60);
  return `${h ? `${h}:` : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(x).padStart(2, "0")}`;
};

export default function Partida() {
  const { id } = useParams();
  const { datos: p, error, cargando } = useDatos(`/runs/${id}`);
  const [sel, setSel] = useState(0);

  if (cargando) return <Cargando filas={5} />;
  if (error) return <Fallo error={error} />;
  const j = p.jugadores[Math.min(sel, p.jugadores.length - 1)];
  const jefes = Object.keys({ ...(p.jefes_aparecidos || {}), ...(p.jefes_muertos || {}) });

  return (
    <>
      <nav className="migas" aria-label="Ruta">
        <Link to="/partidas">Partidas</Link>
        <ChevronRight size={14} />
        <span>{nombreMapa(p.mapa, p.sitio)} · ronda {p.ronda}</span>
      </nav>

      <header className="detalle-cab" style={{ marginTop: 14 }}>
        <Ronda n={p.ronda} xl />
        <div>
          <h1>{nombreMapa(p.mapa, p.sitio)} · {grupo(p.jugadores.length)}</h1>
          <div className="meta-linea">
            <span><Users size={15} />{p.jugadores.map((x) => x.nombre).join(", ")}</span>
            <span><Clock size={15} />{duracion(p.duracion_s)}</span>
            <span><CalendarDays size={15} />{fecha(p.fecha)}</span>
            {p.version && <span><Tag size={15} />v{p.version}</span>}
            {p.dificultad_max > 0 && <span className="tag tag-linea" title="Dificultad más alta del equipo (carta Maldición): más zombies y más duros, a cambio de más experiencia y puntos">Dificultad {p.dificultad_max} %</span>}
            {p.subido_por && <span><Upload size={15} />subida por {p.subido_por}</span>}
            {p.terminada === 0 && <span className="tag tag-linea" title="El juego se reinició o se cerró: es el último guardado (al acabar una ronda)">Sin terminar</span>}
            {p.ronda < 10 && <span className="tag tag-linea" title="Acabó antes de la ronda 10: sale en Resets y no cuenta para la clasificación">Reset</span>}
            {p.prueba && <span className="tag tag-linea" title="Tenía dvars del mod cambiados: no cuenta para la clasificación">Prueba</span>}
          </div>
        </div>
        {jefes.length > 0 && (
          <div className="jefes">
            {jefes.map((t) => (
              <div className="jefe" key={t}>
                <span>{JEFES[t] || t}</span>
                <b>{p.jefes_muertos?.[t] || 0}<small className="ten" style={{ fontSize: 14 }}> / {p.jefes_aparecidos?.[t] || 0}</small></b>
              </div>
            ))}
            {p.baston_construidos > 0 && <div className="jefe"><span>Bastón</span><b>{p.baston_construidos}{p.baston_forjados ? ` · ${p.baston_forjados} forjado` : ""}</b></div>}
          </div>
        )}
      </header>

      <BorrarPartida p={p} />
      <ResumenPartida p={p} />

      {p.jugadores.length > 1 && (
        <div className="pestanas-j" role="tablist">
          {p.jugadores.map((x, i) => (
            <button key={x.nombre} type="button" role="tab" aria-selected={i === sel} onClick={() => setSel(i)}>
              {x.nombre}
              <span className="ten peq">nv {x.nivel}</span>
            </button>
          ))}
        </div>
      )}
      <Jugador j={j} solo={p.jugadores.length === 1} />
    </>
  );
}

// Datos de la partida entera (JSON de la 1.10.3 en adelante): tiempos de ronda,
// ritmo por ronda de cada jugador, duracion de las rondas, jefes y tecnico.
function ResumenPartida({ p }) {
  const [metrica, setMetrica] = useState("bajas");
  const conRondas = p.jugadores.some((j) => j.rondas && j.rondas.length);
  if (!conRondas && !p.hitos && !p.jefes && p.primera_caida_ronda === undefined) return null;
  const col = { bajas: 1, puntos: 2, danio: 3, nivel: 5 }[metrica];
  const series = p.jugadores.map((j, i) => ({
    nombre: j.nombre,
    color: COLORES_JUGADOR[i % COLORES_JUGADOR.length],
    puntos: (j.rondas || []).map((f) => ({ x: f[0], y: f[col] })),
  }));
  const sinCaer = p.primera_caida_ronda === undefined ? null : p.primera_caida_ronda > 0 ? p.primera_caida_ronda : p.ronda;
  const hitos = Object.entries(p.hitos || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
  const tecnico = Object.entries(p.tecnico || {});
  const dvars = Object.entries(p.dvars || {});

  return (
    <>
      <Seccion titulo="La partida">
        <div className="chips">
          {hitos.map(([r, t]) => <div className="chip" key={r}><small>Ronda {r}</small><b>{reloj(t)}</b></div>)}
          {sinCaer !== null && <div className="chip"><small>Sin caer hasta</small><b>ronda {sinCaer}</b></div>}
          {p.fin && p.fin.causa && <div className="chip"><small>Acabó por</small><b>{CAUSAS[p.fin.causa] || p.fin.causa}{p.fin.ultimo ? ` · ${p.fin.ultimo}` : ""}</b></div>}
          {tecnico.map(([k, v]) => <div className="chip" key={k}><small>{TECNICO[k] || k}</small><b>{fmt(v)}</b></div>)}
        </div>
        {(p.abandonos || []).length > 0 && (
          <p className="ten peq" style={{ marginTop: 10 }}>Se fueron: {p.abandonos.map((a) => `${a.nombre} (ronda ${a.ronda})`).join(", ")}.</p>
        )}
        {dvars.length > 0 && (
          <p className="ten peq" style={{ marginTop: 10 }}>Dvars cambiados: {dvars.map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
        )}
      </Seccion>

      {conRondas && (
        <Seccion titulo="Ritmo por ronda" extra="lo que hizo cada jugador en cada ronda">
          <Segmentos valor={metrica} onCambio={setMetrica} ariaLabel="Dato" opciones={[["bajas", "Bajas"], ["puntos", "Puntos"], ["danio", "Daño"], ["nivel", "Nivel"]]} />
          <div style={{ marginTop: 12 }}><GraficaRondas series={series} formato={fmt} /></div>
        </Seccion>
      )}

      {(p.rondas || []).length > 0 && (
        <Seccion titulo="Duración de cada ronda">
          <ColumnasRondas puntos={p.rondas.map((f) => ({ x: f[0], y: f[1], detalle: `${f[2]} zombies vivos a la vez como máximo` }))} formato={(v) => reloj(v)} />
        </Seccion>
      )}

      {(p.jefes || []).length > 0 && (
        <Seccion titulo="Jefes" extra={`${p.jefes.length} aparecidos`}>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Jefe</th><th className="der">Ronda</th><th className="der">Vivo</th><th>Remató</th><th>Daño</th><th className="der">Cartas</th></tr></thead>
              <tbody>
                {p.jefes.map((x, i) => (
                  <tr key={i}>
                    <td className="nombre">{JEFES[x.tipo] || x.tipo}{x.tipo === "bruja" && x.toques ? <span className="ten"> · {x.toques} toques</span> : null}</td>
                    <td className="der num">{x.ronda}</td>
                    <td className="der num">{reloj(x.segundos)}{x.muerto ? "" : " (vivo)"}</td>
                    <td>{x.remato || "—"}</td>
                    <td className="ten peq">{Object.entries(x.danio || {}).sort((a, b) => b[1] - a[1]).map(([n, d]) => `${n} ${fmt(d)}`).join(" · ") || "—"}</td>
                    <td className="der num">{x.tipo === "leroy" ? `${x.robadas} robadas · ${x.recuperadas} recuperadas` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      )}
    </>
  );
}

// Solo para administradores: borrar una partida mal subida. Dos pasos (pide
// confirmacion en la misma linea) y luego vuelve a la lista de partidas.
function BorrarPartida({ p }) {
  const { yo } = useSesion();
  const navegar = useNavigate();
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState("");
  if (!yo || !yo.admin) return null;

  async function borrar() {
    setPaso(2);
    setError("");
    try {
      await borrarPartida(p.id);
      vaciarCache();
      navegar("/partidas", { replace: true, state: { borrada: p.id } });
    } catch (e) {
      setError(e.message);
      setPaso(1);
    }
  }

  return (
    <div className="admin-barra">
      <span className="mayus ten">Administración</span>
      {paso === 0 ? (
        <button type="button" className="boton sec peq peligro" onClick={() => setPaso(1)}>
          <Trash2 size={14} /> Borrar partida
        </button>
      ) : (
        <>
          <span className="peq">
            ¿Borrar esta partida de ronda {p.ronda} ({p.jugadores.map((x) => x.nombre).join(", ")})? Desaparece de la lista, la clasificación, los récords y los perfiles. No se puede deshacer.
          </span>
          <button type="button" className="boton peq peligro-lleno" disabled={paso === 2} onClick={borrar}>
            {paso === 2 ? "Borrando…" : "Sí, borrar"}
          </button>
          <button type="button" className="boton texto peq" disabled={paso === 2} onClick={() => setPaso(0)}>Cancelar</button>
        </>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  );
}

function Jugador({ j, solo }) {
  const danioCartas = Object.entries(j.danio_cartas || {}).sort((a, b) => b[1] - a[1]);
  const maxCarta = danioCartas.length ? danioCartas[0][1] : 0;
  const armas = Object.keys({ ...(j.danio_armas || {}), ...(j.bajas_armas || {}), ...(j.arma_tiempo || {}) })
    .map((a) => ({
      id: a, danio: j.danio_armas?.[a] || 0, bajas: j.bajas_armas?.[a] || 0, tiempo: j.arma_tiempo?.[a] || 0,
      disparos: j.disparos_armas?.[a] || 0, impactos: j.impactos_armas?.[a] || 0, cabezas: j.cabezas_armas?.[a] || 0,
    }))
    .filter((a) => a.id !== "none" || a.danio || a.bajas)
    .sort((a, b) => b.danio - a.danio || b.bajas - a.bajas);
  const conUso = !!j.arma_tiempo;
  const maxArma = armas.length ? Math.max(...armas.map((a) => a.danio)) : 0;
  const cartas = (j.cartas || []).filter((c) => c.tipo === "normal");
  const deArq = cartas.filter((c) => c.arquetipo);
  const generales = cartas.filter((c) => !c.arquetipo);
  const otras = (j.cartas || []).filter((c) => c.tipo !== "normal");

  return (
    <div style={{ marginTop: solo ? 26 : 0 }}>
      <div className="identidad">
        <h2>{j.nombre}</h2>
        <TagClase id={j.clase} />
        <TagArquetipo id={j.arquetipo} />
        <TagMitica id={j.mitica} />
        <span className="ten">nivel {j.nivel}</span>
      </div>

      <dl className="datos">
        <div><dt>Bajas</dt><dd>{fmt(j.bajas)}</dd></div>
        <div><dt>A la cabeza</dt><dd>{fmt(j.cabezas)}<small>{pct(j.cabezas, j.bajas)}</small></dd></div>
        <div><dt>Daño total</dt><dd>{fmt(j.danio_total)}</dd></div>
        <div><dt>Puntos</dt><dd>{fmt(j.puntos_total)}</dd></div>
        <div><dt>Caídas</dt><dd>{j.caidas}</dd></div>
        <div><dt>Reanimaciones</dt><dd>{j.reanimaciones}</dd></div>
        <div><dt>Combo máximo</dt><dd>{j.max_combo}</dd></div>
        <div><dt>Rerolls · bloqueos · saltos</dt><dd>{j.rerolls_usados} · {j.bloqueos_usados} · {j.saltos}</dd></div>
      </dl>

      <div className="rejilla" style={{ marginTop: 6 }}>
        <div>
          <Seccion titulo="Daño por fuente" extra="arma y cada carta según lo que puso en el multiplicador">
            {danioCartas.length ? (
              <div className="barras">
                {danioCartas.map(([id, d]) => {
                  const c = carta(id);
                  return (
                    <FilaBarra key={id} etiqueta={nombreCarta(id)} valor={d} max={maxCarta}
                      color={id === "arma" ? "#cfc6b8" : id === "clase" ? "#e7bb4f" : c.arquetipo ? colorArquetipo(c.arquetipo) : "#a39b90"}
                      texto={fmt(d)} sub={pct(d, j.danio_total)} />
                  );
                })}
              </div>
            ) : <p className="vacio">Sin datos de daño.</p>}
          </Seccion>

          <Seccion titulo="Armas">
            {armas.length ? (
              <div className="tabla-env">
                <table className="tabla">
                  <thead><tr><th>Arma</th><th style={{ width: conUso ? "32%" : "45%" }}>Daño</th><th className="der">Bajas</th>
                    {conUso && <><th className="der m-oculta">En la mano</th><th className="der m-oculta" title="Impactos por disparo: las escopetas cuentan cada perdigón, así que pueden pasar del 100 %">Precisión</th><th className="der m-oculta">Cabezas</th></>}
                  </tr></thead>
                  <tbody>
                    {armas.map((a) => (
                      <tr key={a.id}>
                        <td className="nombre">{nombreArma(a.id)}</td>
                        <td>
                          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px", alignItems: "center", gap: 10 }}>
                            <div className="riel"><i style={{ width: `${maxArma ? Math.max(1.5, (100 * a.danio) / maxArma) : 0}%` }} /></div>
                            <span className="num der" style={{ textAlign: "right" }}>{fmt(a.danio)}</span>
                          </div>
                        </td>
                        <td className="der num">{fmt(a.bajas)}</td>
                        {conUso && <>
                          <td className="der num m-oculta">{a.tiempo ? reloj(a.tiempo) : "—"}</td>
                          <td className="der num m-oculta">{a.disparos ? pct(a.impactos, a.disparos) : "—"}</td>
                          <td className="der num m-oculta">{fmt(a.cabezas)}</td>
                        </>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="vacio">Sin datos de armas.</p>}
          </Seccion>

          <Analisis j={j} />

          <Seccion titulo="Progresión" extra={`${(j.historial || []).length} cartas cogidas`}>
            <Progresion j={j} />
          </Seccion>
        </div>

        <aside>
          <Seccion titulo="Build final" extra={`${cartas.length} cartas`}>
            {deArq.length > 0 && (
              <>
                <div className="grupo-titulo"><TagArquetipo id={j.arquetipo || deArq[0].arquetipo} /></div>
                <div className="build-grande" style={{ gridTemplateColumns: "1fr" }}>{deArq.map((c) => <CartaLinea key={c.id} c={c} />)}</div>
              </>
            )}
            {generales.length > 0 && (
              <>
                <div className="grupo-titulo"><span className="mayus ten">Generales</span></div>
                <div className="build-grande" style={{ gridTemplateColumns: "1fr" }}>{generales.map((c) => <CartaLinea key={c.id} c={c} />)}</div>
              </>
            )}
            {j.mitica && (
              <>
                <div className="grupo-titulo"><span className="mayus ten">Mítica</span></div>
                <div className="carta-linea"><Ficha id={j.mitica} mitica grande /><span className="cn">{nombreCarta(j.mitica)}</span><span /></div>
              </>
            )}
            {otras.length > 0 && (
              <p className="ten peq" style={{ marginTop: 12 }}>
                También usó: {otras.map((c) => `${nombreCarta(c.id)}${c.veces > 1 ? ` ×${c.veces}` : ""}`).join(", ")}.
              </p>
            )}
          </Seccion>
          {j.bebidas && j.bebidas.length > 0 && (
            <Seccion titulo="Bebidas de la Bruja">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{j.bebidas.map((b) => <span key={b} className="tag tag-linea">{nombreBebida(b)}</span>)}</div>
            </Seccion>
          )}
          {j.cartas_perdidas && j.cartas_perdidas.length > 0 && (
            <Seccion titulo="Cartas perdidas" extra={j.recuperadas ? `${j.recuperadas} recuperadas de Leroy` : undefined}>
              <ul className="calc-lista" style={{ listStyle: "none", padding: 0 }}>
                {j.cartas_perdidas.map((c, i) => (
                  <li key={i}><span className="ten">R{c.ronda}</span> {nombreCarta(c.id)} <span className="ten">· {c.motivo === "leroy" ? "robada por Leroy" : "al caer"}</span></li>
                ))}
              </ul>
            </Seccion>
          )}
        </aside>
      </div>
    </div>
  );
}

// Datos de analisis del jugador (JSON de la 1.10.3 en adelante).
function Analisis({ j }) {
  const recibido = Object.entries(j.danio_recibido || {}).sort((a, b) => b[1] - a[1]);
  const maxRecibido = recibido.length ? recibido[0][1] : 0;
  const totalRecibido = recibido.reduce((a, [, v]) => a + v, 0);
  const caidas = j.caidas_detalle || [];
  const fuente = j.puntos_fuente || {};
  const gastos = j.gastos || {};
  const ingresos = j.puntos_fuente ? [
    ["Juego (impactos, bajas, power-ups)", Math.max(0, (j.puntos_total || 0) - (fuente.clase || 0) - (fuente.cartas || 0))],
    ["Bonus de clase", fuente.clase || 0],
    ["Cartas", fuente.cartas || 0],
  ] : [];
  const gastado = Math.max(0, (j.puntos_total || 0) - (j.puntos_final || 0));
  const salidas = j.gastos ? [
    ["Caja de cartas", gastos.caja || 0],
    ["Reparar torretas", gastos.torreta || 0],
    ["La Bruja", gastos.bruja || 0],
    ["Puertas, bebidas, paredes…", Math.max(0, gastado - (gastos.caja || 0) - (gastos.torreta || 0) - (gastos.bruja || 0))],
  ] : [];
  const maxIngreso = Math.max(0, ...ingresos.map((x) => x[1]));
  const maxSalida = Math.max(0, ...salidas.map((x) => x[1]));
  const torretas = Object.entries(j.torretas || {}).filter(([, v]) => v);
  if (!recibido.length && !caidas.length && !ingresos.length && j.clase_letales === undefined) return null;

  return (
    <>
      {(caidas.length > 0 || j.desangrados !== undefined) && (
        <Seccion titulo="Caídas" extra={j.desangrados ? `${j.desangrados} desangrado${j.desangrados === 1 ? "" : "s"}` : undefined}>
          {caidas.length ? (
            <div className="tabla-env">
              <table className="tabla">
                <thead><tr><th className="der">Ronda</th><th>Qué le tumbó</th><th className="der">En el suelo</th><th>Le levantó</th></tr></thead>
                <tbody>
                  {caidas.map((c, i) => (
                    <tr key={i}>
                      <td className="der num">{c.ronda}</td>
                      <td>{CAUSAS[c.causa] || c.causa}</td>
                      <td className="der num">{reloj(c.segundos)}</td>
                      <td>{c.desangrado ? <span style={{ color: "var(--sangre)" }}>Se desangró</span> : c.reanimo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="vacio">No cayó ni una vez.</p>}
        </Seccion>
      )}

      {recibido.length > 0 && (
        <Seccion titulo="Daño recibido" extra={`${fmt(totalRecibido)} en total`}>
          <div className="barras">
            {recibido.map(([k, v]) => <FilaBarra key={k} etiqueta={CAUSAS[k] || k} valor={v} max={maxRecibido} texto={fmt(v)} sub={pct(v, totalRecibido)} />)}
          </div>
        </Seccion>
      )}

      {ingresos.length > 0 && (
        <Seccion titulo="Puntos" extra={`${fmt(j.puntos_total)} ganados · ${fmt(gastado)} gastados`}>
          <div className="grupo-titulo"><span className="mayus ten">De dónde salen</span></div>
          <div className="barras">
            {ingresos.map(([k, v]) => <FilaBarra key={k} etiqueta={k} valor={v} max={maxIngreso} texto={fmt(v)} sub={pct(v, j.puntos_total)} />)}
          </div>
          <div className="grupo-titulo" style={{ marginTop: 14 }}><span className="mayus ten">En qué se gastan</span></div>
          <div className="barras">
            {salidas.map(([k, v]) => <FilaBarra key={k} etiqueta={k} valor={v} max={maxSalida} texto={fmt(v)} sub={pct(v, gastado)} color="var(--tx-3)" />)}
          </div>
          {j.caja_usos > 0 && <p className="ten peq" style={{ marginTop: 10 }}>Usó la caja de cartas {j.caja_usos} {j.caja_usos === 1 ? "vez" : "veces"}.</p>}
        </Seccion>
      )}

      {(j.clase_letales !== undefined || (j.especiales || []).length > 0 || (j.bebidas_ronda || []).length > 0 || torretas.length > 0) && (
        <Seccion titulo="Clase, armas especiales y bebidas">
          <div className="chips">
            {j.clase === "escopetas" && <div className="chip"><small>Muertes de un golpe</small><b>{fmt(j.clase_letales)}</b></div>}
            {j.clase === "rifles" && <div className="chip"><small>Remates del Ejecutor</small><b>{fmt(j.clase_letales)}</b></div>}
            {j.clase === "automaticas" && <div className="chip"><small>Racha máxima</small><b>{fmt(j.racha_max)} tiros</b></div>}
            {torretas.map(([k, v]) => <div className="chip" key={k}><small>Torretas · {TORRETA[k] || k}</small><b>{fmt(v)}</b></div>)}
          </div>
          {(j.especiales || []).length > 0 && (
            <p className="peq" style={{ marginTop: 10 }}><span className="ten">Arma especial:</span> {j.especiales.map((e) => `${nombreArma(e.arma)} (ronda ${e.ronda})`).join(", ")}</p>
          )}
          {(j.bebidas_ronda || []).length > 0 && (
            <p className="peq" style={{ marginTop: 6 }}><span className="ten">Bebidas:</span> {j.bebidas_ronda.map((b) => `${nombreBebida(b.id)} (ronda ${b.ronda})`).join(", ")}</p>
          )}
        </Seccion>
      )}
    </>
  );
}

function CartaLinea({ c }) {
  const def = carta(c.id);
  return (
    <div className="carta-linea" style={def.arquetipo ? { "--c": colorArquetipo(def.arquetipo) } : undefined}>
      <Ficha id={c.id} grande />
      <div style={{ minWidth: 0 }}>
        <div className="cn">{nombreCarta(c.id)}</div>
        <div className="cs">{def.firma ? `firma de ${ARQUETIPOS[def.arquetipo]?.nombre}` : def.copias > 1 ? `${c.veces}/${def.copias} copias` : `cogida ${c.veces} ${c.veces === 1 ? "vez" : "veces"}`}</div>
      </div>
      <span className="cv">{valorCarta(c.id, c.valor)}</span>
    </div>
  );
}

// Cartas cogidas agrupadas por ronda, con las perdidas tachadas en su ronda.
function Progresion({ j }) {
  const porRonda = new Map();
  for (const h of j.historial || []) {
    if (!porRonda.has(h.ronda)) porRonda.set(h.ronda, []);
    porRonda.get(h.ronda).push({ ...h, tipo: "coge" });
  }
  for (const c of j.cartas_perdidas || []) {
    if (!porRonda.has(c.ronda)) porRonda.set(c.ronda, []);
    porRonda.get(c.ronda).push({ ...c, tipo: "pierde" });
  }
  const rondas = [...porRonda.keys()].sort((a, b) => a - b);
  if (!rondas.length) return <p className="vacio">Sin historial.</p>;
  return (
    <div className="progresion">
      {rondas.map((r) => (
        <div className="prog-ronda" key={r}>
          <span className="r">R{r}</span>
          <div className="prog-items">
            {porRonda.get(r).map((h, i) => h.tipo === "coge" ? (
              <span key={i} className="prog-item" style={{ "--c": RAREZAS[h.rareza] || "#9a9aa6" }} data-tip={`${RAREZA_TXT[h.rareza] || h.rareza}${(h.exacto ?? h.valor) ? ` · ${valorCarta(h.id, h.exacto ?? h.valor)}` : ""}`}>
                <i />
                <b>{nombreCarta(h.id)}</b>
                {(h.exacto ?? h.valor) ? <small>{valorCarta(h.id, h.exacto ?? h.valor)}</small> : null}
              </span>
            ) : (
              <span key={i} className="prog-item perdida" data-tip={h.motivo === "leroy" ? "Robada por Leroy" : "Perdida al caer"}>
                <b>{nombreCarta(h.id)}</b>
                <small>{h.motivo === "leroy" ? "Leroy" : "caída"}</small>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
