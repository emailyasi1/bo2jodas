import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import {
  DATOS, CARTAS, RAREZAS, vidaDeSerie, zombiesPorRonda, enemigos, simularArma, probEscopeta,
  efectos, baston, BASTON, explosivo, goo, modDeArma, firmaActiva, esFranco,
} from "../calc/motor.js";
import { ARQUETIPOS, RAREZAS as COLOR_RAREZA, fmt } from "../nombres.js";
import { Ficha, Seccion, colorRonda } from "../ui.jsx";

const CFG = DATOS.cfg;
const ZONAS = [["cabeza", "Cabeza"], ["cuello", "Cuello"], ["pecho", "Pecho"], ["tripa", "Tripa"], ["brazo", "Brazo"], ["pierna", "Pierna"]];
const CLASES = DATOS.clases;
const ARQ = Object.fromEntries(DATOS.arquetipos.map((a) => [a.id, a]));
// Cartas que se pueden tener en la build (las de equipo, power-up e instantaneas no se guardan).
const CARTAS_BUILD = DATOS.cartas.filter((c) => c.tipo === "normal");
const GRUPOS_CARTAS = [{ id: "", nombre: "Generales" }, ...DATOS.arquetipos.map((a) => ({ id: a.id, nombre: a.nombre }))]
  .map((g) => ({ ...g, cartas: CARTAS_BUILD.filter((c) => c.arquetipo === g.id) }));
// Cartas que cambian algo de lo que calcula esta pagina.
const DE_DANIO = new Set([
  "danio", "cadencia", "explosivo", "melee", "cabeza", "adrenalina", "punteria", "ultimas", "cazatanques", "combo", "critico",
  "furia", "ultimo", "pulso", "tambor", "plomo", "sangrefria", "madrugador", "interes", "plutocrata", "mecha", "unabala", "elites",
  "coloso", "fosforo", "napalm", "pirotecnico", "pararrayos", "cadena", "sobrecarga", "condensador", "tormenta", "tesla", "espinas",
  "ciclon", "silbato", "manada", "collar", "alfa",
]);
const ARMAS = DATOS.armas.flatMap((g) => g.armas.map((a) => ({ ...a, grupo: g.nombre })));
const ARMA = Object.fromEntries(ARMAS.flatMap((a) => [[a.id, a], ...(a.mejorada ? [[a.mejorada.id, { ...a.mejorada, grupo: a.grupo }]] : [])]));
const NOMBRE_SUMANDO = { clase: "Ventaja de clase", ultimo: "Último aliento" };
const CLAVE_RAREZA = ["COMUN", "POCO COMUN", "RARA", "EPICA", "LEGENDARIA"];
const CORTO_RAREZA = ["C", "PC", "R", "É", "L"];

function valorTxt(c, v) {
  let s = String(v);
  if (c.decimal === 2) s = `${Math.trunc(v / 100)}.${String(v % 100).padStart(2, "0")}`;
  else if (c.decimal === 1) s = `${Math.trunc(v / 10)}.${v % 10}`;
  return `${c.prefijo}${s}${c.sufijo}`;
}
const pct = (a, b) => (b > 0 ? `${((100 * a) / b).toFixed(a / b >= 0.1 ? 0 : 1)} %` : "");
const n = (x) => (Number.isFinite(x) ? fmt(x) : "—");

function Campo({ etiqueta, children, ayuda }) {
  return (
    <label className="calc-campo" title={ayuda}>
      <span>{etiqueta}</span>
      {children}
    </label>
  );
}

function Numero({ valor, set, min = 0, max = 999999, paso = 1 }) {
  return <input type="number" value={valor} min={min} max={max} step={paso} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || 0)))} />;
}

function Check({ etiqueta, valor, set, ayuda }) {
  return (
    <label className="calc-check" title={ayuda}>
      <input type="checkbox" checked={valor} onChange={(e) => set(e.target.checked)} /> {etiqueta}
    </label>
  );
}

// Selector grande de ronda con botones -/+.
function Paso({ etiqueta, valor, set, min, max }) {
  return (
    <div className="paso">
      <span className="mayus ten">{etiqueta}</span>
      <div>
        <button type="button" aria-label={`Bajar ${etiqueta}`} onClick={() => set(Math.max(min, valor - 1))}><Minus size={16} /></button>
        <input type="number" value={valor} min={min} max={max} onChange={(e) => set(Math.max(min, Math.min(max, Number(e.target.value) || min)))} aria-label={etiqueta} />
        <button type="button" aria-label={`Subir ${etiqueta}`} onClick={() => set(Math.min(max, valor + 1))}><Plus size={16} /></button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ carta de la build
function FilaCarta({ c, valor, setValor, quitar, build }) {
  const activa = !c.firma || firmaActiva(build, c.id);
  return (
    <li className="calc-carta" style={{ "--c": c.arquetipo ? ARQUETIPOS[c.arquetipo]?.color : "#a39b90" }}>
      <div className="calc-carta-cab">
        <Ficha id={c.id} />
        <span className="cn">{c.nombre}</span>
        <span className="ca">{c.arquetipo ? ARQ[c.arquetipo]?.nombre : "General"}{c.firma ? " · firma" : ""}</span>
        <button type="button" className="calc-x" onClick={quitar} title="Quitar" aria-label={`Quitar ${c.nombre}`}><X size={15} /></button>
      </div>
      <div className="nota">{c.desc}</div>
      {c.firma ? (
        <div className={activa ? "estado-ok" : "estado-mal"}>
          {activa ? "Activa" : `Inactiva: necesita ${c.requiere.map((r) => CARTAS[r]?.nombre || r).join(" y ")}`}
        </div>
      ) : (
        <div className="calc-carta-valor">
          <Numero valor={valor} set={setValor} min={0} max={c.tope} />
          <span className="nota">{valorTxt(c, valor)} · tope {valorTxt(c, c.tope)}</span>
          <div className="calc-rarezas">
            {c.valores.map((x, i) => (
              <button type="button" key={i} style={{ "--c": COLOR_RAREZA[CLAVE_RAREZA[i]] }} title={`Sumar una ${RAREZAS[i].toLowerCase()} (${valorTxt(c, x)})`} onClick={() => setValor(Math.min(c.tope, valor + x))}>
                +{CORTO_RAREZA[i]}
              </button>
            ))}
            <button type="button" style={{ "--c": "#a39b90" }} onClick={() => setValor(c.tope)}>Tope</button>
          </div>
        </div>
      )}
      {!DE_DANIO.has(c.id) && <div className="nota">No cambia nada de lo que calcula esta página.</div>}
    </li>
  );
}

const SIT_INICIAL = {
  apuntando: false, media_vida: false, cargador_bajo: false, pulso: false, rafaga: false, solo: false, madrugador: false,
  ultimo_aliento: false, quieto: false, lejos: true, alfa: false, junto_dt: false, dt_comprado: false,
  racha: 40, plomo: 0, combo: 0, furia: 0, puntos: 0, bebidas: 4,
};

export default function Calculadora() {
  const [ronda, setRonda] = useState(20);
  const [jugadores, setJugadores] = useState(4);
  const [clase, setClase] = useState("");
  const [mitica, setMitica] = useState("");
  const [cartas, setCartas] = useState([]); // [{id, valor}]
  const [armaId, setArmaId] = useState("galil_zm");
  const [pap, setPap] = useState(false);
  const [zona, setZona] = useState("cabeza");
  const [distancia, setDistancia] = useState(400);
  const [critico, setCritico] = useState("media");
  const [carga, setCarga] = useState("staff_fire_upgraded_zm");
  const [sit, setSitTodo] = useState(SIT_INICIAL);
  const setSit = (k) => (x) => setSitTodo((s) => ({ ...s, [k]: x }));

  const huecos = Math.round(CFG.max_cartas + (clase === "pistolas" ? CFG.pistolas_huecos : 0));
  const v = Object.fromEntries(cartas.map((c) => [c.id, CARTAS[c.id].firma ? 1 : c.valor]));
  // "Lejos" (mas de 600 u) lo decide la distancia; Una bala basta lo mira.
  const build = { clase, mitica, v, sit: { ...sit, lejos: distancia > 600 } };
  const arquetiposUsados = [...new Set(cartas.map((c) => CARTAS[c.id].arquetipo).filter(Boolean))];

  const base = ARMA[armaId];
  const arma = pap && base.mejorada ? { ...base.mejorada, grupo: base.grupo } : base;
  const esBaston = arma.id.startsWith("staff_fire");
  const idBaston = esBaston ? (arma.id === "staff_fire_zm" ? "staff_fire_zm" : carga) : null;
  const claseArma = arma.grupo === "Pistolas" ? "pistola" : "";
  const op = { zona, distancia, critico, mod: modDeArma(arma, claseArma) };
  const en = enemigos(ronda);
  const zs = zombiesPorRonda(ronda, jugadores);

  const resultados = useMemo(() => en.map((e) => {
    if (esBaston) return { e, tipo: "baston", r: baston(idBaston, e, build, op) };
    if (arma.id.startsWith("slipgun")) return { e, tipo: "goo" };
    if (arma.id.startsWith("slowgun")) return { e, tipo: "paralizador" };
    if (arma.tipo === "projectile" || arma.tipo === "grenade") return { e, tipo: "explosivo", r: explosivo(arma, ronda, e, build, op) };
    return { e, tipo: "arma", r: simularArma(arma, e, build, op) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify(build), arma.id, idBaston, ronda, zona, distancia, critico]);

  const primero = resultados[0].r?.primero;
  const tablaEfectos = en.map((e) => efectos(ronda, e, build, op));
  const filasEfectos = tablaEfectos[0].map((f, i) => ({ ...f, porEnemigo: tablaEfectos.map((t) => t[i]) }));
  const cercanas = [ronda - 2, ronda - 1, ronda, ronda + 1, ronda + 2].filter((r) => r >= 1);

  function anadir(id) {
    if (!id || cartas.some((c) => c.id === id)) return;
    const c = CARTAS[id];
    setCartas([...cartas, { id, valor: c.firma ? 1 : c.valores[0] }]);
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Herramientas</span>
          <h1>Calculadora</h1>
          <p className="mut">Vida y zombies de cada ronda, y lo que hace tu build disparo a disparo. Usa las fórmulas del mod y el daño de los archivos de arma del juego.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Paso etiqueta="Ronda" valor={ronda} set={setRonda} min={1} max={255} />
          <Paso etiqueta="Jugadores" valor={jugadores} set={setJugadores} min={1} max={8} />
        </div>
      </div>

      <div className="calc">
        <div className="panel">
          <div className="calc-bloque">
            <h3>Clase y mítica</h3>
            <div className="calc-fila">
              <Campo etiqueta="Clase">
                <select value={clase} onChange={(e) => setClase(e.target.value)}>
                  <option value="">Ninguna</option>
                  {CLASES.map((c) => <option key={c.id} value={c.id}>{c.nombre}: {c.desc}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Mítica">
                <select value={mitica} onChange={(e) => setMitica(e.target.value)}>
                  <option value="">Ninguna</option>
                  {DATOS.miticas.map((m) => <option key={m.id} value={m.id}>{m.nombre}: {m.desc}</option>)}
                </select>
              </Campo>
            </div>
          </div>

          <div className="calc-bloque">
            <h3>Arma</h3>
            <div className="calc-fila">
              <Campo etiqueta="Arma">
                <select value={armaId} onChange={(e) => setArmaId(e.target.value)}>
                  {DATOS.armas.map((g) => (
                    <optgroup key={g.nombre} label={g.nombre}>
                      {g.armas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Campo>
              {esBaston && arma.id !== "staff_fire_zm" && (
                <Campo etiqueta="Disparo">
                  <select value={carga} onChange={(e) => setCarga(e.target.value)}>
                    {["staff_fire_upgraded_zm", "staff_fire_upgraded2_zm", "staff_fire_upgraded3_zm"].map((id) => <option key={id} value={id}>{BASTON[id].nombre}</option>)}
                  </select>
                </Campo>
              )}
              {(arma.tipo === "bullet" || arma.tipo === "projectile") && (
                <Campo etiqueta="Zona del cuerpo">
                  <select value={zona} onChange={(e) => setZona(e.target.value)}>{ZONAS.map(([id, t]) => <option key={id} value={id}>{t} (×{arma.zonas[id]})</option>)}</select>
                </Campo>
              )}
              {arma.tipo === "bullet" && (
                <Campo etiqueta="Distancia (40 u ≈ 1 m)" ayuda={`Daño ${arma.danio} hasta ${arma.alcance_max} u, ${arma.danio_min} desde ${arma.alcance_min} u`}>
                  <Numero valor={distancia} set={setDistancia} min={0} max={10000} paso={50} />
                </Campo>
              )}
              <Campo etiqueta="Golpe crítico" ayuda="×2.5 con la probabilidad de la carta">
                <select value={critico} onChange={(e) => setCritico(e.target.value)}>
                  <option value="nunca">No sale</option><option value="media">Media</option><option value="siempre">Sale siempre</option>
                </select>
              </Campo>
            </div>
            {base.mejorada && <Check etiqueta={`Pack-a-Punch: ${base.mejorada.nombre}`} valor={pap} set={setPap} />}
            {arma.tipo === "bullet" && (
              <p className="ten peq">
                {arma.nombre}: {arma.danio} de daño hasta {fmt(arma.alcance_max)} u y {arma.danio_min} desde {fmt(arma.alcance_min)} u
                {arma.perdigones > 1 ? `, ${arma.perdigones} perdigones` : ""}, cargador de {arma.cargador}, un disparo cada {arma.cadencia} s. Cabeza ×{arma.zonas.cabeza}, cuello ×{arma.zonas.cuello}.
              </p>
            )}
          </div>

          <div className="calc-bloque">
            <h3>Situación</h3>
            <div className="calc-situaciones">
              <Check etiqueta="Apuntando con la mira" valor={sit.apuntando} set={setSit("apuntando")} />
              <Check etiqueta="Tu vida por debajo de la mitad" valor={sit.media_vida} set={setSit("media_vida")} />
              <Check etiqueta="Cargador por debajo del 30 %" valor={sit.cargador_bajo} set={setSit("cargador_bajo")} />
              <Check etiqueta="2 s sin disparar antes de cada tiro" valor={sit.pulso} set={setSit("pulso")} />
              <Check etiqueta="Más de 1 s disparando seguido" valor={sit.rafaga} set={setSit("rafaga")} />
              <Check etiqueta="Ningún zombie a menos de 240 u" valor={sit.solo} set={setSit("solo")} />
              <Check etiqueta="Primeros 30 s de la ronda" valor={sit.madrugador} set={setSit("madrugador")} />
              <Check etiqueta="Último aliento activo" valor={sit.ultimo_aliento} set={setSit("ultimo_aliento")} />
              <Check etiqueta="Quieto" valor={sit.quieto} set={setSit("quieto")} />
              <Check etiqueta="Alfa activo (3 s tras una baja)" valor={sit.alfa} set={setSit("alfa")} />
              <Check etiqueta="Junto a la máquina de Double Tap" valor={sit.junto_dt} set={setSit("junto_dt")} ayuda="Ahí la carta quita el Double Tap regalado para que puedas comprarlo" />
              {sit.junto_dt && <Check etiqueta="Double Tap comprado" valor={sit.dt_comprado} set={setSit("dt_comprado")} />}
            </div>
            <div className="calc-numeros">
              {clase === "automaticas" && <Campo etiqueta="Aciertos seguidos antes"><Numero valor={sit.racha} set={setSit("racha")} max={1000} /></Campo>}
              <Campo etiqueta="Balas sin recargar"><Numero valor={sit.plomo} set={setSit("plomo")} max={1000} /></Campo>
              <Campo etiqueta="Bajas seguidas (máx. 10)"><Numero valor={sit.combo} set={setSit("combo")} max={10} /></Campo>
              <Campo etiqueta="Golpes recibidos en 5 s"><Numero valor={sit.furia} set={setSit("furia")} max={3} /></Campo>
              <Campo etiqueta="Tus puntos"><Numero valor={sit.puntos} set={setSit("puntos")} paso={1000} /></Campo>
              <Campo etiqueta="Bebidas"><Numero valor={sit.bebidas} set={setSit("bebidas")} max={12} /></Campo>
            </div>
          </div>

          <div className="calc-bloque">
            <h3>Cartas {cartas.length}/{huecos}</h3>
            {arquetiposUsados.length > 1 && (
              <p className="aviso">En partida solo tendrías las cartas de un arquetipo (más las generales). Aquí puedes mezclarlas igualmente.</p>
            )}
            {cartas.length > 0 && (
              <ul className="calc-cartas">
                {cartas.map((x, i) => (
                  <FilaCarta key={x.id} c={CARTAS[x.id]} valor={x.valor} build={build}
                    setValor={(val) => setCartas(cartas.map((y, j) => (j === i ? { ...y, valor: val } : y)))}
                    quitar={() => setCartas(cartas.filter((_, j) => j !== i))} />
                ))}
              </ul>
            )}
            {cartas.length < huecos && (
              <select className="select calc-anadir" value="" onChange={(e) => anadir(e.target.value)}>
                <option value="">Añadir carta…</option>
                {GRUPOS_CARTAS.map((g) => (
                  <optgroup key={g.id || "gen"} label={g.nombre}>
                    {g.cartas.filter((c) => !cartas.some((x) => x.id === c.id)).map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}{DE_DANIO.has(c.id) ? "" : " (no afecta al daño)"}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>
        </div>

        <aside className="calc-lado">
          <div className="panel">
            <div className="calc-bloque">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h3>Ronda <span style={{ color: colorRonda(ronda) }}>{ronda}</span></h3>
                <span className="ten peq">{fmt(zs.total)} zombies · {jugadores} jug.</span>
              </div>
              <div className="enemigos">
                {resultados.map(({ e, tipo, r }) => (
                  <div className="enemigo" key={e.id}>
                    <span className="en">{e.nombre}</span>
                    <span className="ed">
                      {tipo === "arma" ? n(r.disparos) : tipo === "explosivo" || tipo === "baston" ? n(r.golpes) : tipo === "goo" ? (e.jefe ? 7 : 1) : "?"}
                      <small>disparos</small>
                    </span>
                    <span className="ev">{fmt(e.vida)} de vida{e.jefe ? ` · tope ${fmt(Math.trunc(e.vida * 0.15))}/golpe` : ""}</span>
                    {tipo === "arma" && (
                      <span className="ex">
                        {fmt(r.primero.recibido)} el primero ({pct(r.primero.recibido, e.vida)}) · {r.tiempo.toFixed(1)} s{r.cargadores ? ` · ${r.cargadores.toFixed(1)} carg.` : ""}
                        {r.perdigones > 1 ? ` · ${n(r.golpes)} perdigones` : ""}{r.letalPor === "unabala" ? " · remata Una bala basta" : ""}
                      </span>
                    )}
                    {tipo === "explosivo" && <span className="ex">{r.partes.map((p) => `${p.que.split(" (")[0]} ${fmt(p.final)}`).join(" + ")}{r.extra ? ` + extra ${fmt(r.extra.final)}` : ""}</span>}
                    {tipo === "baston" && <span className="ex">Impacto {fmt(r.imp.final)} + 8 × {fmt(r.seg.final)}/s{r.remate ? " · puede rematar al impactar" : ""}</span>}
                    {tipo === "goo" && <span className="ex">{e.jefe ? "El goo le quita el 15 % por golpe." : `El goo hace ${fmt(goo())}: lo mata.`}</span>}
                    {tipo === "paralizador" && <span className="ex">Daña al frenarlo por debajo del 10 % de velocidad; depende del tiempo, no se simula.</span>}
                  </div>
                ))}
              </div>
              {clase === "escopetas" && arma.tipo === "bullet" && (() => {
                const p = probEscopeta(arma);
                return (
                  <p className="ten peq">
                    Además, el tiro de suerte de Escopetas: {Math.round(p.p * 100)} % por {esFranco(arma.id) ? "bala" : "perdigón"}, un {(p.porDisparo * 100).toFixed(1)} % por disparo de matar al momento (al jefe, ×3).
                  </p>
                );
              })()}
            </div>
            {primero && (
              <div className="calc-bloque">
                <h3>Primer impacto a un zombie</h3>
                <div className="desglose">
                  <div><span className="mut">Daño del arma</span><b>{fmt(primero.base)}</b></div>
                  {Object.entries(primero.sumandos).map(([id, p]) => (
                    <div key={id}><span>{NOMBRE_SUMANDO[id] || CARTAS[id]?.nombre || id}</span><b>{p > 0 ? "+" : ""}{p} %</b></div>
                  ))}
                  {Object.entries(primero.factores).map(([id, f]) => (
                    <div key={id}><span>{id === "critico_media" ? "Golpe crítico (media)" : CARTAS[id]?.nombre || DATOS.miticas.find((m) => m.id === id)?.nombre || "Ventaja de clase"}</span><b>×{Number(f).toFixed(2)}</b></div>
                  ))}
                  <div className="total"><span>Multiplicador {(primero.mult ?? 1).toFixed(3)}</span><b style={{ color: "var(--lava)" }}>{fmt(primero.recibido)}</b></div>
                </div>
                {resultados[0].r.aprox && <p className="ten peq">Distancia entre los dos alcances del arma: daño aproximado.</p>}
                <p className="ten peq">Los % se suman en un único multiplicador; los × se aplican después.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {filasEfectos.length > 0 && (
        <Seccion titulo="Otras fuentes de daño de tu build" extra={`ronda ${ronda}`}>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Efecto</th><th>Cuándo</th>{en.map((e) => <th key={e.id} className="der">{e.nombre}</th>)}</tr></thead>
              <tbody>
                {filasEfectos.map((f) => (
                  <tr key={f.id}>
                    <td><b>{f.nombre}</b><div className="ten peq">{f.nota}</div></td>
                    <td className="ten peq">{f.cuando}</td>
                    {f.porEnemigo.map((x, i) => (
                      <td key={i} className="der num">{fmt(x.final)}<div className="ten peq">{pct(x.final, en[i].vida)}</div></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      )}

      <div className="rejilla" style={{ marginTop: 4 }}>
        <Seccion titulo="Vida por ronda" extra={`${fmt(vidaDeSerie(ronda))} sin el mod en la ${ronda}`}>
          <div className="tabla-env">
            <table className="tabla">
              <thead><tr><th>Ronda</th>{en.map((e) => <th key={e.id} className="der">{e.nombre}</th>)}<th className="der">Zombies</th></tr></thead>
              <tbody>
                {cercanas.map((r) => (
                  <tr key={r} style={r === ronda ? { background: "var(--s2)" } : undefined}>
                    <td><b style={{ color: colorRonda(r), fontFamily: "var(--f-tit)", fontSize: 17 }}>{r}</b></td>
                    {enemigos(r).map((x) => <td key={x.id} className="der num">{fmt(x.vida)}</td>)}
                    <td className="der num">{fmt(zombiesPorRonda(r, jugadores).total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
        <Seccion titulo="Cómo sale cada cosa">
          <ul className="calc-lista">
            <li>Ronda 1 = {CFG.vida_base} de vida; hasta la 9 suma {CFG.vida_ronda}; desde la 10, ×{(1 + CFG.vida_mult).toFixed(2)} por ronda.</li>
            <li>Zombies: la fórmula del juego ×{CFG.zombies_mult}; cada jugador por encima de 4 suma un {Math.round(CFG.zombies_extra_jugador * 100)} %. Como mucho {Math.round(CFG.max_zombies)} vivos a la vez.</li>
            <li>Tanques desde la ronda {CFG.tanque_ronda}: los que salen andando y un {CFG.tanque_pct} % del resto. Vida ×{CFG.tanque_vida}.</li>
            <li>Jefe cada {CFG.jefe_minutos} min con {CFG.jefe_escoltas} tanques de escolta; ningún golpe le quita más del 15 %.</li>
            <li>No se cuenta: lo que haga Double Tap dentro del motor, la caída exacta de daño entre alcances (se interpola), el Instakill, el goo encadenado ni las mejoras persistentes del juego.</li>
          </ul>
        </Seccion>
      </div>
    </>
  );
}
