// Piezas de interfaz compartidas por todas las paginas.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Flame, Zap, Axe, Crosshair, Shield, Coins, Gauge, Wind, PawPrint, Clover, Wrench, Gem, ChevronRight,
} from "lucide-react";
import { api } from "./api.js";
import { ARQUETIPOS, CLASES, carta, colorArquetipo, nombreArquetipo, nombreClase, nombreMitica, fmt } from "./nombres.js";

// ------------------------------------------------------------ datos con cache
const cache = new Map();

// Tras borrar o subir algo, que todas las paginas vuelvan a pedir los datos.
export function vaciarCache() {
  cache.clear();
}

export function useDatos(ruta) {
  const [estado, setEstado] = useState(() => (cache.has(ruta) ? { datos: cache.get(ruta) } : { cargando: true }));
  useEffect(() => {
    let vivo = true;
    if (!ruta) return undefined;
    if (cache.has(ruta)) setEstado({ datos: cache.get(ruta) });
    api(ruta)
      .then((d) => {
        cache.set(ruta, d);
        if (vivo) setEstado({ datos: d });
      })
      .catch((e) => vivo && !cache.has(ruta) && setEstado({ error: e.message }));
    return () => {
      vivo = false;
    };
  }, [ruta]);
  return estado;
}

export function Cargando({ filas = 4 }) {
  return (
    <div className="esqueleto" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => <div key={i} />)}
    </div>
  );
}

export function Fallo({ error }) {
  return <p className="error">No se pudo cargar: {error}</p>;
}

// ------------------------------------------------------------ iconos y colores
export const ICONO_ARQ = {
  piromano: Flame, electricista: Zap, berserker: Axe, francotirador: Crosshair, tanque: Shield,
  banquero: Coins, gatillo: Gauge, velocista: Wind, domador: PawPrint, suertudo: Clover, mecanico: Wrench,
};

export function colorRonda(r) {
  if (r >= 50) return "#ff5a45";
  if (r >= 40) return "#e7bb4f";
  if (r >= 30) return "#f0882a";
  if (r >= 20) return "#d6a874";
  if (r >= 10) return "#b9ad9c";
  return "#8a8378";
}

export function Ronda({ n, xl }) {
  return (
    <div className={xl ? "ronda ronda-xl" : "ronda"} style={{ "--c": colorRonda(n) }} title={`Ronda ${n}`}>
      <b>{n}</b>
      <small>RONDA</small>
    </div>
  );
}

export function TagClase({ id }) {
  if (!id) return <span className="tag">Sin clase</span>;
  return <span className="tag" style={{ "--c": CLASES[id]?.color }}>{nombreClase(id)}</span>;
}

export function TagArquetipo({ id }) {
  if (!id) return <span className="tag tag-linea">Sin arquetipo</span>;
  const Icono = ICONO_ARQ[id];
  return (
    <span className="tag" style={{ "--c": colorArquetipo(id) }}>
      {Icono && <Icono size={13} strokeWidth={2.2} />}
      {nombreArquetipo(id)}
    </span>
  );
}

export function TagMitica({ id }) {
  if (!id) return null;
  return (
    <span className="tag" style={{ "--c": "#e0503f" }}>
      <Gem size={12} strokeWidth={2.2} />
      {nombreMitica(id)}
    </span>
  );
}

// "Golpe crítico" -> GC, "Calibre" -> CA (palabras de mas de 2 letras).
function iniciales(nombre) {
  const p = nombre.split(/\s+/).filter((x) => x.length > 2);
  if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
  return (p[0] || nombre).slice(0, 2).toUpperCase();
}

// decimal 1 / 2: la carta guarda decimas / centesimas. Desde la 1.10.10 los
// valores por copia llevan decimales: hasta 2, sin ceros de sobra (como
// jodas_numero en el mod).
function textoValor(c, valor) {
  if (valor === undefined || valor === null) return "";
  let v = Number(valor);
  if (c.decimal === 2) v /= 100;
  else if (c.decimal === 1) v /= 10;
  const s = String(Math.round(v * 100) / 100);
  return `${c.prefijo || ""}${s}${c.sufijo || ""}`;
}

// Copias de una carta: "3/10" (las de 1 copia, nada; partidas viejas, "x3").
export function textoCopias(id, veces) {
  const c = carta(id);
  if (!veces) return "";
  if (!c.copias || c.copias <= 1) return veces > 1 ? `×${veces}` : "";
  return `${veces}/${c.copias}`;
}

export function valorCarta(id, valor) {
  const c = carta(id);
  if (c.firma) return "Firma";
  return textoValor(c, valor);
}

// Ficha cuadrada de una carta: icono del arquetipo (o iniciales si es general).
export function Ficha({ id, valor, veces, grande, mitica }) {
  const c = carta(id);
  const arq = c.arquetipo;
  const Icono = mitica ? Gem : arq ? ICONO_ARQ[arq] : null;
  const clases = ["ficha"];
  if (grande) clases.push("ficha-g");
  if (mitica) clases.push("ficha-mitica");
  else if (!arq) clases.push("ficha-general");
  if (c.firma) clases.push("ficha-firma");
  const tip = mitica
    ? `${nombreMitica(id)}\nMítica`
    : `${c.nombre}${valor !== undefined && !c.firma ? `  ${textoValor(c, valor)}` : ""}${textoCopias(id, veces) ? `  ${textoCopias(id, veces)}` : ""}\n${arq ? `${ARQUETIPOS[arq]?.nombre}${c.firma ? " · firma" : ""}` : "General"}`;
  return (
    <span className={clases.join(" ")} style={arq ? { "--c": colorArquetipo(arq) } : undefined} data-tip={tip} tabIndex={0} aria-label={tip}>
      {Icono ? <Icono size={grande ? 18 : 15} strokeWidth={2} /> : iniciales(c.nombre)}
      {veces > 1 && <span className="veces">{veces}</span>}
    </span>
  );
}

// Fila de fichas: primero las del arquetipo (firma la primera), luego generales; la mitica al final.
export function Build({ cartas = [], mitica, max = 20 }) {
  const orden = [...cartas]
    .filter((c) => carta(c.id).tipo === "normal" || carta(c.id).tipo === "?")
    .sort((a, b) => {
      const ca = carta(a.id);
      const cb = carta(b.id);
      const pa = ca.arquetipo ? (ca.firma ? 0 : 1) : 2;
      const pb = cb.arquetipo ? (cb.firma ? 0 : 1) : 2;
      return pa - pb || (b.veces || 0) - (a.veces || 0);
    });
  const vistas = orden.slice(0, max);
  return (
    <div className="build">
      {vistas.map((c) => <Ficha key={c.id} id={c.id} valor={c.valor} veces={c.veces} />)}
      {orden.length > max && <span className="ficha ficha-general" data-tip={`${orden.length - max} cartas más`}>+{orden.length - max}</span>}
      {mitica && <Ficha id={mitica} mitica />}
    </div>
  );
}

// ------------------------------------------------------------ secciones, barras y top
export function Seccion({ titulo, extra, children, className = "" }) {
  return (
    <section className={`seccion ${className}`}>
      <div className="seccion-cab">
        <h2>{titulo}</h2>
        {extra && <span className="extra">{extra}</span>}
      </div>
      {children}
    </section>
  );
}

export function FilaBarra({ etiqueta, valor, max, color, texto, sub, titulo }) {
  const pct = max > 0 ? Math.max(1.5, (100 * valor) / max) : 0;
  return (
    <div className="barra-fila" style={color ? { "--c": color } : undefined} title={titulo}>
      <span className="et">{etiqueta}</span>
      <div className="riel"><i style={{ width: `${pct}%` }} /></div>
      <span className="va">{texto ?? fmt(valor)}{sub && <small>{sub}</small>}</span>
    </div>
  );
}

// Panel "top" con barra proporcional bajo cada nombre (el primero en rojo).
export function Top({ titulo, filas, valor, texto, enlace, vacio = "Todavía nada." }) {
  const max = filas.length ? Math.max(...filas.map(valor)) : 0;
  return (
    <div className="panel">
      <div className="panel-cab"><h3>{titulo}</h3></div>
      {filas.length === 0 ? (
        <p className="ten peq" style={{ padding: "10px 18px 16px" }}>{vacio}</p>
      ) : (
        <ol className="top">
          {filas.map((f, i) => {
            const contenido = (
              <>
                <span className="pos">{i + 1}</span>
                <span className="quien">{f.nombre}</span>
                <span className="cuanto">{texto ? texto(f) : fmt(valor(f))}</span>
                <span className="riel"><i style={{ width: `${max ? Math.max(2, (100 * valor(f)) / max) : 0}%` }} /></span>
              </>
            );
            return <li key={`${f.nombre}-${i}`}>{enlace ? <Link to={enlace(f)} style={{ display: "contents" }}>{contenido}</Link> : contenido}</li>;
          })}
        </ol>
      )}
    </div>
  );
}

export function Chevron() {
  return <ChevronRight className="chev" size={18} />;
}

// ------------------------------------------------------------ tiempo
export function hace(iso) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "ahora mismo";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 7) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function grupo(n) {
  return ["", "Solo", "Dúo", "Trío", "Cuarteto"][n] || `${n} jugadores`;
}
