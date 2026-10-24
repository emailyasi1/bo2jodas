import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Cargando, Fallo, useDatos } from "../ui.jsx";
import { FilaPartida } from "./comun.jsx";
import { ARQUETIPOS, CLASES } from "../nombres.js";

const ORDEN = [["fecha", "Recientes"], ["ronda", "Ronda"], ["duracion", "Duración"]];
const TAMANO = [["", "Todas"], ["1", "Solo"], ["2", "Dúo"], ["3", "Trío"], ["4", "Cuarteto"], ["5", "5 o más"]];

export default function Partidas() {
  const { datos, error, cargando } = useDatos("/runs?limit=1000");
  const [orden, setOrden] = useState("fecha");
  const [tam, setTam] = useState("");
  const [clase, setClase] = useState("");
  const [arq, setArq] = useState("");
  const [buscar, setBuscar] = useState("");

  const lista = useMemo(() => {
    if (!datos) return [];
    const q = buscar.trim().toLowerCase();
    return datos
      .filter((p) => !tam || (tam === "5" ? p.jugadores.length >= 5 : p.jugadores.length === Number(tam)))
      .filter((p) => !clase || p.jugadores.some((j) => j.clase === clase))
      .filter((p) => !arq || p.jugadores.some((j) => j.arquetipo === arq))
      .filter((p) => !q || p.jugadores.some((j) => j.nombre.toLowerCase().includes(q)))
      .sort((a, b) =>
        orden === "ronda" ? b.ronda - a.ronda || (b.fecha > a.fecha ? 1 : -1)
          : orden === "duracion" ? b.duracion_s - a.duracion_s
            : b.fecha > a.fecha ? 1 : -1);
  }, [datos, orden, tam, clase, arq, buscar]);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Archivo</span>
          <h1>Partidas</h1>
          <p className="mut">Todas las partidas subidas, con la build de cada jugador. Pasa el ratón por una carta para ver qué es y cuánto llevaba.</p>
        </div>
      </div>

      <div className="filtros">
        <div className="segmentos" role="group" aria-label="Ordenar">
          {ORDEN.map(([v, t]) => <button key={v} type="button" aria-pressed={orden === v} onClick={() => setOrden(v)}>{t}</button>)}
        </div>
        <select className="select" value={tam} onChange={(e) => setTam(e.target.value)} aria-label="Jugadores">
          {TAMANO.map(([v, t]) => <option key={v} value={v}>{v ? t : "Cualquier grupo"}</option>)}
        </select>
        <select className="select" value={clase} onChange={(e) => setClase(e.target.value)} aria-label="Clase">
          <option value="">Cualquier clase</option>
          {Object.entries(CLASES).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}
        </select>
        <select className="select" value={arq} onChange={(e) => setArq(e.target.value)} aria-label="Arquetipo">
          <option value="">Cualquier arquetipo</option>
          {Object.entries(ARQUETIPOS).map(([id, a]) => <option key={id} value={id}>{a.nombre}</option>)}
        </select>
        <label className="buscador">
          <Search size={15} />
          <input className="entrada" placeholder="Buscar jugador" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </label>
        {datos && <span className="ten peq" style={{ marginLeft: "auto" }}>{lista.length} de {datos.length}</span>}
      </div>

      {cargando && <Cargando filas={6} />}
      {error && <Fallo error={error} />}
      {datos && (lista.length ? (
        <div className="partidas">{lista.map((p) => <FilaPartida key={p.id} p={p} resaltar={buscar ? p.jugadores.find((j) => j.nombre.toLowerCase().includes(buscar.toLowerCase()))?.nombre : undefined} />)}</div>
      ) : (
        <p className="vacio">Ninguna partida cumple esos filtros.</p>
      ))}
    </>
  );
}
