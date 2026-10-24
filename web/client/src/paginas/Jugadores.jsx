import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Cargando, Fallo, TagArquetipo, TagClase, colorRonda, useDatos } from "../ui.jsx";
import { fmt } from "../nombres.js";

const favorito = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

export default function Jugadores() {
  const { datos, error, cargando } = useDatos("/stats");
  const [buscar, setBuscar] = useState("");
  const [orden, setOrden] = useState("mejorRonda");
  const lista = useMemo(() => {
    if (!datos) return [];
    const q = buscar.trim().toLowerCase();
    return datos.jugadores.filter((j) => !q || j.nombre.toLowerCase().includes(q)).sort((a, b) => b[orden] - a[orden]);
  }, [datos, buscar, orden]);

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Comunidad</span>
          <h1>Jugadores</h1>
          <p className="mut">Totales de todas sus partidas subidas. Entra en uno para ver sus cartas favoritas y su historial.</p>
        </div>
      </div>
      <div className="filtros">
        <div className="segmentos" role="group" aria-label="Ordenar">
          {[["mejorRonda", "Mejor ronda"], ["partidas", "Partidas"], ["bajas", "Bajas"], ["danio_total", "Daño"]].map(([v, t]) => (
            <button key={v} type="button" aria-pressed={orden === v} onClick={() => setOrden(v)}>{t}</button>
          ))}
        </div>
        <label className="buscador">
          <Search size={15} />
          <input className="entrada" placeholder="Buscar jugador" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </label>
      </div>
      {cargando && <Cargando />}
      {error && <Fallo error={error} />}
      {datos && (lista.length ? (
        <div className="tabla-env">
          <table className="tabla">
            <thead>
              <tr>
                <th>Jugador</th>
                <th className="der">Mejor ronda</th>
                <th className="der">Partidas</th>
                <th className="der m-oculta">Bajas</th>
                <th className="der m-oculta">Daño</th>
                <th className="der m-oculta">Caídas</th>
                <th className="m-oculta">Suele jugar</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((j) => (
                <tr key={j.nombre}>
                  <td><Link className="nombre" to={`/jugador/${encodeURIComponent(j.nombre)}`}>{j.nombre}</Link></td>
                  <td className="der"><span className="grande" style={{ color: colorRonda(j.mejorRonda) }}>{j.mejorRonda}</span></td>
                  <td className="der num">{j.partidas}</td>
                  <td className="der num m-oculta">{fmt(j.bajas)}</td>
                  <td className="der num m-oculta">{fmt(j.danio_total)}</td>
                  <td className="der num m-oculta">{j.caidas}</td>
                  <td className="m-oculta"><span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}><TagClase id={favorito(j.clases)} />{favorito(j.arquetipos) && <TagArquetipo id={favorito(j.arquetipos)} />}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="vacio">No hay jugadores con ese nombre.</p>)}
    </>
  );
}
