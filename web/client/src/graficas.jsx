// Graficas de una partida (SVG propio, sin librerias): lineas por ronda (una
// serie por jugador) y columnas por ronda (una serie). Normas: un solo eje Y,
// lineas de 2 px, rejilla discreta, color fijo por jugador (por orden, nunca
// por posicion en el ranking), leyenda + etiqueta al final de cada linea, ficha
// al pasar el raton y vista de tabla con los mismos datos.
import { useEffect, useRef, useState } from "react";

// Paleta categorica (version oscura de la paleta de referencia de dataviz),
// validada contra la superficie de los paneles (#161513): CVD >= 8.4, vision
// normal >= 19.3, contraste >= 3:1. Un color por jugador, en este orden.
export const COLORES_JUGADOR = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];

function useAncho(ref) {
  const [ancho, setAncho] = useState(640);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return ancho;
}

// Marcas "redondas" del eje Y: 0 y 3-4 pasos de 1/2/5 x 10^n.
function pasos(max) {
  if (max <= 0) return [0, 1];
  const bruto = max / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((m) => m * mag).find((m) => m >= bruto);
  const out = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + paso);
  return out;
}

const abreviar = (v) => (Math.abs(v) >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e4 ? `${+(v / 1e3).toFixed(0)}k` : `${v}`);

const M = { arriba: 12, derecha: 92, abajo: 28, izquierda: 52 };

// series: [{ nombre, color, puntos: [{ x, y }] }] (x = ronda)
export function GraficaRondas({ series, formato = (v) => v.toLocaleString("es-ES"), unidad = "", alto = 260 }) {
  const ref = useRef(null);
  const ancho = useAncho(ref);
  const [hover, setHover] = useState(null);
  const [tabla, setTabla] = useState(false);
  const xs = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.x)))].sort((a, b) => a - b);
  if (!xs.length) return <p className="vacio">Sin datos por ronda.</p>;
  const ys = pasos(Math.max(0, ...series.flatMap((s) => s.puntos.map((p) => p.y))));
  const yMax = ys[ys.length - 1] || 1;
  const etiquetas = series.length <= 4;
  const der = etiquetas ? M.derecha : 16;
  const iw = ancho - M.izquierda - der;
  const ih = alto - M.arriba - M.abajo;
  const x0 = xs[0];
  const x1 = xs[xs.length - 1];
  const sx = (x) => M.izquierda + (x1 === x0 ? iw / 2 : ((x - x0) / (x1 - x0)) * iw);
  const sy = (y) => M.arriba + ih - (y / yMax) * ih;
  const cadaX = Math.max(1, Math.ceil(xs.length / Math.max(2, Math.floor(iw / 46))));

  function mover(e) {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ancho;
    let mejor = xs[0];
    for (const x of xs) if (Math.abs(sx(x) - px) < Math.abs(sx(mejor) - px)) mejor = x;
    setHover(mejor);
  }

  const filasHover = hover === null ? [] : series.map((s) => ({ s, p: s.puntos.find((p) => p.x === hover) })).filter((f) => f.p);
  const ultimos = series.map((s) => ({ s, p: s.puntos[s.puntos.length - 1] })).filter((f) => f.p).sort((a, b) => sy(a.p.y) - sy(b.p.y));
  // Etiquetas al final de la linea sin solaparse (14 px como minimo entre ellas).
  let previa = -Infinity;
  const posEtiqueta = ultimos.map((f) => {
    const y = Math.max(sy(f.p.y), previa + 14);
    previa = y;
    return { ...f, y };
  });

  return (
    <div className="grafica" ref={ref}>
      <div className="grafica-cab">
        {series.length > 1 && (
          <ul className="leyenda">
            {series.map((s) => <li key={s.nombre}><i style={{ background: s.color }} />{s.nombre}</li>)}
          </ul>
        )}
        <button type="button" className="boton texto peq" onClick={() => setTabla((t) => !t)}>{tabla ? "Ver gráfica" : "Ver tabla"}</button>
      </div>
      {tabla ? (
        <div className="tabla-env grafica-tabla">
          <table className="tabla">
            <thead><tr><th>Ronda</th>{series.map((s) => <th key={s.nombre} className="der">{s.nombre}</th>)}</tr></thead>
            <tbody>
              {xs.map((x) => (
                <tr key={x}><td className="num">{x}</td>{series.map((s) => <td key={s.nombre} className="der num">{formato(s.puntos.find((p) => p.x === x)?.y ?? 0)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grafica-lienzo">
          <svg width={ancho} height={alto} role="img" aria-label={`Gráfica por ronda de ${series.map((s) => s.nombre).join(", ")}`}
            onMouseMove={mover} onMouseLeave={() => setHover(null)}>
            {ys.map((v) => (
              <g key={v}>
                <line x1={M.izquierda} x2={M.izquierda + iw} y1={sy(v)} y2={sy(v)} className="rejilla" />
                <text x={M.izquierda - 8} y={sy(v)} className="eje" textAnchor="end" dominantBaseline="middle">{abreviar(v)}</text>
              </g>
            ))}
            {xs.filter((_, i) => i % cadaX === 0).map((x) => (
              <text key={x} x={sx(x)} y={alto - 8} className="eje" textAnchor="middle">{x}</text>
            ))}
            <text x={M.izquierda} y={alto - 8} className="eje" textAnchor="end" dx={-8}>R</text>
            {series.map((s) => (
              <polyline key={s.nombre} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                points={s.puntos.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")} />
            ))}
            {etiquetas && posEtiqueta.map(({ s, p, y }) => (
              <text key={s.nombre} x={sx(p.x) + 8} y={y} className="etiqueta-linea" dominantBaseline="middle">{s.nombre}</text>
            ))}
            {hover !== null && (
              <g>
                <line x1={sx(hover)} x2={sx(hover)} y1={M.arriba} y2={M.arriba + ih} className="cruz" />
                {filasHover.map(({ s, p }) => <circle key={s.nombre} cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill={s.color} className="punto" />)}
              </g>
            )}
          </svg>
          {hover !== null && filasHover.length > 0 && (
            <div className="ficha-grafica" style={{ left: Math.min(sx(hover) + 12, ancho - 190), top: 8 }}>
              <b>Ronda {hover}</b>
              {filasHover.map(({ s, p }) => (
                <span key={s.nombre}><i style={{ background: s.color }} />{s.nombre}<em>{formato(p.y)}{unidad}</em></span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// puntos: [{ x, y, detalle }] (una columna por ronda, una sola serie)
export function ColumnasRondas({ puntos, formato = (v) => v.toLocaleString("es-ES"), color = "var(--lava)", alto = 200 }) {
  const ref = useRef(null);
  const ancho = useAncho(ref);
  const [hover, setHover] = useState(null);
  if (!puntos.length) return <p className="vacio">Sin datos por ronda.</p>;
  const ys = pasos(Math.max(0, ...puntos.map((p) => p.y)));
  const yMax = ys[ys.length - 1] || 1;
  const iw = ancho - M.izquierda - 16;
  const ih = alto - M.arriba - M.abajo;
  const paso = iw / puntos.length;
  const bw = Math.max(1, paso - 2); // 2 px de hueco entre columnas
  const sy = (y) => M.arriba + ih - (y / yMax) * ih;
  const cadaX = Math.max(1, Math.ceil(puntos.length / Math.max(2, Math.floor(iw / 46))));
  const h = hover !== null ? puntos[hover] : null;

  return (
    <div className="grafica" ref={ref}>
      <div className="grafica-lienzo">
        <svg width={ancho} height={alto} role="img" aria-label="Columnas por ronda" onMouseLeave={() => setHover(null)}>
          {ys.map((v) => (
            <g key={v}>
              <line x1={M.izquierda} x2={M.izquierda + iw} y1={sy(v)} y2={sy(v)} className="rejilla" />
              <text x={M.izquierda - 8} y={sy(v)} className="eje" textAnchor="end" dominantBaseline="middle">{formato(v)}</text>
            </g>
          ))}
          {puntos.map((p, i) => {
            const x = M.izquierda + i * paso + 1;
            const alto_ = Math.max(1, M.arriba + ih - sy(p.y));
            const r = Math.min(2, bw / 2, alto_ / 2);
            return (
              <g key={p.x} onMouseEnter={() => setHover(i)}>
                {/* Zona de raton mas grande que la columna. */}
                <rect x={M.izquierda + i * paso} y={M.arriba} width={paso} height={ih} fill="transparent" />
                <rect x={x} y={sy(p.y)} width={bw} height={alto_} rx={r} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
              </g>
            );
          })}
          {puntos.map((p, i) => (i % cadaX === 0 ? <text key={p.x} x={M.izquierda + i * paso + paso / 2} y={alto - 8} className="eje" textAnchor="middle">{p.x}</text> : null))}
        </svg>
        {h && (
          <div className="ficha-grafica" style={{ left: Math.min(M.izquierda + hover * paso + paso + 8, ancho - 190), top: 8 }}>
            <b>Ronda {h.x}</b>
            <span><em>{formato(h.y)}</em></span>
            {h.detalle && <span className="ten">{h.detalle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
