import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ChevronRight, Clock, Tag, Trash2, Upload, Users } from "lucide-react";
import {
  Cargando, Fallo, Ficha, FilaBarra, Ronda, Seccion, TagArquetipo, TagClase, TagMitica, grupo, useDatos, valorCarta, vaciarCache,
} from "../ui.jsx";
import { borrarPartida } from "../api.js";
import { useSesion } from "../sesion.jsx";
import { ARQUETIPOS, RAREZAS, carta, colorArquetipo, duracion, fecha, fmt, nombreArma, nombreBebida, nombreCarta, nombreMapa } from "../nombres.js";

const JEFES = { brutus: "Brutus", bruja: "Bruja", leroy: "Leroy" };
const RAREZA_TXT = { COMUN: "Común", "POCO COMUN": "Poco común", RARA: "Rara", EPICA: "Épica", LEGENDARIA: "Legendaria", MITICA: "Mítica" };
const pct = (a, b) => (b > 0 ? `${((100 * a) / b).toFixed(a / b >= 0.1 ? 0 : 1)} %` : "");

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
            {p.subido_por && <span><Upload size={15} />subida por {p.subido_por}</span>}
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
  const armas = Object.keys({ ...(j.danio_armas || {}), ...(j.bajas_armas || {}) })
    .map((a) => ({ id: a, danio: j.danio_armas?.[a] || 0, bajas: j.bajas_armas?.[a] || 0 }))
    .sort((a, b) => b.danio - a.danio || b.bajas - a.bajas);
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
                  <thead><tr><th>Arma</th><th style={{ width: "45%" }}>Daño</th><th className="der">Bajas</th></tr></thead>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="vacio">Sin datos de armas.</p>}
          </Seccion>

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

function CartaLinea({ c }) {
  const def = carta(c.id);
  return (
    <div className="carta-linea" style={def.arquetipo ? { "--c": colorArquetipo(def.arquetipo) } : undefined}>
      <Ficha id={c.id} grande />
      <div style={{ minWidth: 0 }}>
        <div className="cn">{nombreCarta(c.id)}</div>
        <div className="cs">{def.firma ? `firma de ${ARQUETIPOS[def.arquetipo]?.nombre}` : `cogida ${c.veces} ${c.veces === 1 ? "vez" : "veces"}`}</div>
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
              <span key={i} className="prog-item" style={{ "--c": RAREZAS[h.rareza] || "#9a9aa6" }} data-tip={`${RAREZA_TXT[h.rareza] || h.rareza}${h.valor ? ` · ${valorCarta(h.id, h.valor)}` : ""}`}>
                <i />
                <b>{nombreCarta(h.id)}</b>
                {h.valor ? <small>{valorCarta(h.id, h.valor)}</small> : null}
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
