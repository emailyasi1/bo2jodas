// Controles animados y planos, inspirados en beui.dev (Select, Tabs, Checkbox):
// el panel del desplegable se despliega desde el boton (clip + desplazamiento
// corto, cubic-bezier(0.16, 1, 0.3, 1) ~200 ms), el chevron gira, las opciones
// entran con un pequeno desplazamiento y la elegida lleva un check. Todo con
// CSS: con "reducir movimiento" no hay recorrido, solo fundido.
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

const TYPEAHEAD_MS = 500;

// opciones: [{ v, t, g? (grupo), d? (desactivada) }]
export function Desplegable({ valor, onCambio, opciones, placeholder = "Elegir…", ariaLabel, ancho, className = "", fijo }) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const [arriba, setArriba] = useState(false);
  const raiz = useRef(null);
  const boton = useRef(null);
  const lista = useRef(null);
  const busca = useRef({ texto: "", t: 0 });
  const id = useId();
  const sel = opciones.findIndex((o) => o.v === valor);
  const actual = sel >= 0 ? opciones[sel] : null;
  const habilitadas = opciones.map((o, i) => (o.d ? -1 : i)).filter((i) => i >= 0);

  function abrir() {
    const r = boton.current.getBoundingClientRect();
    const alto = Math.min(340, opciones.length * 34 + 16);
    const abajo = window.innerHeight - r.bottom;
    setArriba(abajo < alto + 16 && r.top > abajo);
    setActivo(sel >= 0 ? sel : habilitadas[0] ?? -1);
    setAbierto(true);
  }

  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  function elegir(i) {
    if (i < 0 || opciones[i].d) return;
    onCambio(opciones[i].v);
    cerrar();
  }

  // Cerrar al pulsar fuera.
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  // Mantener visible la opcion activa.
  useEffect(() => {
    if (!abierto || activo < 0 || !lista.current) return;
    const el = lista.current.querySelector(`[data-i="${activo}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [abierto, activo]);

  function mover(paso) {
    if (!habilitadas.length) return;
    const pos = habilitadas.indexOf(activo);
    const sig = pos < 0 ? 0 : Math.min(habilitadas.length - 1, Math.max(0, pos + paso));
    setActivo(habilitadas[sig]);
  }

  function teclado(e) {
    if (!abierto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); mover(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); mover(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActivo(habilitadas[0]); }
    else if (e.key === "End") { e.preventDefault(); setActivo(habilitadas[habilitadas.length - 1]); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(activo); }
    else if (e.key === "Escape") { e.preventDefault(); cerrar(); }
    else if (e.key === "Tab") cerrar(false);
    else if (e.key.length === 1 && /\S/.test(e.key)) {
      // Buscar escribiendo: repetir la misma letra va saltando entre las que empiezan por ella.
      const ahora = Date.now();
      const b = busca.current;
      b.texto = ahora - b.t > TYPEAHEAD_MS ? e.key.toLowerCase() : b.texto + e.key.toLowerCase();
      b.t = ahora;
      const repetida = b.texto.split("").every((c) => c === b.texto[0]);
      const buscado = repetida ? b.texto[0] : b.texto;
      const desde = repetida ? habilitadas.indexOf(activo) + 1 : 0;
      const orden = [...habilitadas.slice(desde), ...habilitadas.slice(0, desde)];
      const hallada = orden.find((i) => opciones[i].t.toLowerCase().startsWith(buscado));
      if (hallada !== undefined) setActivo(hallada);
    }
  }

  let grupoAnterior = null;
  return (
    <div className={`desp ${abierto ? "abierto" : ""} ${arriba ? "arriba" : ""} ${className}`} ref={raiz} style={ancho ? { width: ancho } : undefined}>
      <button
        ref={boton}
        type="button"
        className="desp-boton"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${id}-lista`}
        aria-activedescendant={abierto && activo >= 0 ? `${id}-op-${activo}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={teclado}
      >
        <span className={actual ? "desp-valor" : "desp-valor vacio-txt"}>{fijo ?? (actual ? actual.t : placeholder)}</span>
        <ChevronDown className="desp-chev" size={15} strokeWidth={2.2} />
      </button>
      <ul ref={lista} id={`${id}-lista`} role="listbox" className="desp-panel" aria-label={ariaLabel} inert={abierto ? undefined : ""} aria-hidden={!abierto} tabIndex={-1}>
        {opciones.map((o, i) => {
          const cabecera = o.g && o.g !== grupoAnterior ? <li key={`g-${o.g}`} role="presentation" className="desp-grupo">{o.g}</li> : null;
          grupoAnterior = o.g;
          return [
            cabecera,
            <li
              key={`${o.v}`}
              id={`${id}-op-${i}`}
              role="option"
              data-i={i}
              aria-selected={i === sel}
              aria-disabled={o.d || undefined}
              className={`desp-op ${i === activo ? "activa" : ""} ${i === sel ? "elegida" : ""} ${o.d ? "desactivada" : ""}`}
              onPointerEnter={() => !o.d && setActivo(i)}
              onClick={() => elegir(i)}
            >
              <span>{o.t}</span>
              {i === sel && <Check size={14} strokeWidth={2.4} />}
            </li>,
          ];
        })}
      </ul>
    </div>
  );
}

// Control segmentado con un indicador que se desliza hasta la opcion elegida.
// opciones: [[valor, texto], ...]
export function Segmentos({ valor, onCambio, opciones, ariaLabel }) {
  const caja = useRef(null);
  const [ind, setInd] = useState(null);

  useLayoutEffect(() => {
    const medir = () => {
      const el = caja.current?.querySelector('[aria-pressed="true"]');
      if (el) setInd({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (caja.current) ro.observe(caja.current);
    return () => ro.disconnect();
  }, [valor, opciones.length]);

  return (
    <div className="segmentos" role="group" aria-label={ariaLabel} ref={caja}>
      {ind && <span className="seg-ind" style={{ transform: `translate(${ind.x}px, ${ind.y}px)`, width: ind.w, height: ind.h }} aria-hidden="true" />}
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onCambio(v)}>{t}</button>
      ))}
    </div>
  );
}

// Casilla con el check que se dibuja al marcarla.
export function Casilla({ etiqueta, valor, onCambio, ayuda }) {
  return (
    <label className="casilla" title={ayuda}>
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} />
      <span className="casilla-caja" aria-hidden="true">
        <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" /></svg>
      </span>
      <span>{etiqueta}</span>
    </label>
  );
}
