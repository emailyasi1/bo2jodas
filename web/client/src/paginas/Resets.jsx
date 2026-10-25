import { Cargando, Fallo, useDatos } from "../ui.jsx";
import { FilaPartida } from "./comun.jsx";

// Partidas que acabaron antes de la ronda 10, tambien las que se quedaron a
// medias por un map_restart / fast_restart (el mod las guarda al acabar cada
// ronda). No cuentan para la clasificacion ni para los totales.
export default function Resets() {
  const { datos, error, cargando } = useDatos("/runs?categoria=reset&limit=1000");
  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Archivo</span>
          <h1>Resets</h1>
          <p className="mut">
            Partidas que acabaron antes de la ronda 10, incluidas las reiniciadas con map_restart o fast_restart (se guarda la última ronda terminada).
            No cuentan para la clasificación ni para los totales.
          </p>
        </div>
      </div>
      {cargando && <Cargando filas={6} />}
      {error && <Fallo error={error} />}
      {datos && (datos.length ? (
        <div className="partidas">{datos.map((p) => <FilaPartida key={p.id} p={p} />)}</div>
      ) : <p className="vacio">Ningún reset todavía.</p>)}
    </>
  );
}
