// Piezas de pagina reutilizadas (filas de partida).
import { Link } from "react-router-dom";
import { Build, Chevron, Ronda, TagArquetipo, TagClase, grupo, hace } from "../ui.jsx";
import { duracion, fmt, nombreMapa } from "../nombres.js";

export function FilaPartida({ p, resaltar }) {
  const bajas = p.jugadores.reduce((s, j) => s + (j.bajas || 0), 0);
  return (
    <Link to={`/partida/${p.id}`} className="partida-fila">
      <Ronda n={p.ronda} />
      <div style={{ minWidth: 0 }}>
        <div className="pf-titulo">
          <b>{nombreMapa(p.mapa, p.sitio)} · {grupo(p.jugadores.length)}</b>
          <span className="pf-meta">{hace(p.fecha)} · {duracion(p.duracion_s)}</span>
          {p.terminada === 0 && <span className="tag tag-linea">Sin terminar</span>}
          {p.prueba && <span className="tag tag-linea">Prueba</span>}
          {p.revision === "en_revision" && <span className="tag tag-linea" style={{ "--c": "var(--lava)" }} title="Pendiente de validar: no cuenta para la clasificación todavía">En revisión</span>}
          {p.revision === "rechazada" && <span className="tag tag-linea" style={{ "--c": "var(--sangre)" }} title="Un administrador la rechazó: no cuenta para la clasificación">Rechazada</span>}
        </div>
        <div className="pf-jugadores">
          {p.jugadores.map((j) => (
            <div className="pf-jugador" key={j.nombre}>
              <span className="nombre" style={resaltar === j.nombre ? { color: "var(--lava)" } : undefined}>{j.nombre}</span>
              <TagClase id={j.clase} />
              <TagArquetipo id={j.arquetipo} />
              {j.cartas && <Build cartas={j.cartas} mitica={j.mitica} max={14} />}
            </div>
          ))}
        </div>
      </div>
      <div className="pf-lado">
        <b>{fmt(bajas)}</b>
        <span className="ten peq">bajas</span>
      </div>
      <Chevron />
    </Link>
  );
}
