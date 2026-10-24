import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { Cargando, Fallo, useDatos } from "../ui.jsx";
import { Desplegable, Segmentos } from "../controles.jsx";
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
  const { state } = useLocation();

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

      {state?.borrada && <p className="aviso" style={{ marginBottom: 16 }}>Partida borrada.</p>}

      <div className="filtros">
        <Segmentos valor={orden} onCambio={setOrden} opciones={ORDEN} ariaLabel="Ordenar" />
        <Desplegable valor={tam} onCambio={setTam} ariaLabel="Jugadores" opciones={TAMANO.map(([v, t]) => ({ v, t: v ? t : "Cualquier grupo" }))} />
        <Desplegable valor={clase} onCambio={setClase} ariaLabel="Clase" opciones={[{ v: "", t: "Cualquier clase" }, ...Object.entries(CLASES).map(([id, c]) => ({ v: id, t: c.nombre }))]} />
        <Desplegable valor={arq} onCambio={setArq} ariaLabel="Arquetipo" opciones={[{ v: "", t: "Cualquier arquetipo" }, ...Object.entries(ARQUETIPOS).map(([id, a]) => ({ v: id, t: a.nombre }))]} />
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
