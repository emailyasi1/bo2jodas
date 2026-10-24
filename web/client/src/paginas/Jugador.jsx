import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Cargando, Fallo, Ficha, FilaBarra, Ronda, Seccion, useDatos } from "../ui.jsx";
import { FilaPartida } from "./comun.jsx";
import { ARQUETIPOS, CLASES, carta, colorArquetipo, duracion, fmt, nombreCarta, nombreMitica } from "../nombres.js";

function Reparto({ titulo, datos, nombre, color }) {
  const filas = Object.entries(datos || {}).sort((a, b) => b[1] - a[1]);
  const max = filas.length ? filas[0][1] : 0;
  return (
    <Seccion titulo={titulo}>
      {filas.length ? (
        <div className="barras">
          {filas.map(([id, n]) => <FilaBarra key={id} etiqueta={nombre(id)} valor={n} max={max} color={color(id)} texto={`${n}`} sub={n === 1 ? "partida" : "partidas"} />)}
        </div>
      ) : <p className="ten peq">Todavía nada.</p>}
    </Seccion>
  );
}

export default function Jugador() {
  const { nombre } = useParams();
  const { datos: j, error, cargando } = useDatos(`/jugadores/${encodeURIComponent(nombre)}`);
  if (cargando) return <Cargando />;
  if (error) return <Fallo error={error.startsWith("404") ? "ese jugador no tiene partidas" : error} />;
  const t = j.totales;
  const cartas = j.cartas.filter((c) => carta(c.id).tipo === "normal").slice(0, 16);
  const maxCarta = cartas.length ? cartas[0].partidas : 0;

  return (
    <>
      <nav className="migas" aria-label="Ruta">
        <Link to="/jugadores">Jugadores</Link>
        <ChevronRight size={14} />
        <span>{j.nombre}</span>
      </nav>
      <header className="detalle-cab" style={{ marginTop: 14, gridTemplateColumns: "auto minmax(0,1fr)" }}>
        <Link to={`/partida/${t.mejorPartida}`} title="Su mejor partida"><Ronda n={t.mejorRonda} xl /></Link>
        <div>
          <span className="mayus ten">Mejor ronda {t.mejorRonda}</span>
          <h1 style={{ marginTop: 4 }}>{j.nombre}</h1>
          <div className="meta-linea">
            <span>{t.partidas} {t.partidas === 1 ? "partida" : "partidas"}</span>
            <span>{duracion(t.segundos)} jugadas</span>
            <span>nivel máximo {t.nivelMax}</span>
          </div>
        </div>
      </header>

      <dl className="datos" style={{ marginTop: 22 }}>
        <div><dt>Bajas</dt><dd>{fmt(t.bajas)}</dd></div>
        <div><dt>A la cabeza</dt><dd>{fmt(t.cabezas)}</dd></div>
        <div><dt>Daño total</dt><dd>{fmt(t.danio_total)}</dd></div>
        <div><dt>Caídas</dt><dd>{t.caidas}</dd></div>
        <div><dt>Reanimaciones</dt><dd>{t.reanimaciones}</dd></div>
        <div><dt>Combo máximo</dt><dd>{t.comboMax}</dd></div>
      </dl>

      <div className="rejilla" style={{ marginTop: 6 }}>
        <Seccion titulo="Sus partidas">
          <div className="partidas">{j.partidas.map((p) => <FilaPartida key={p.id} p={p} resaltar={j.nombre} />)}</div>
        </Seccion>
        <aside>
          <Reparto titulo="Clases" datos={j.clases} nombre={(id) => CLASES[id]?.nombre || id} color={(id) => CLASES[id]?.color} />
          <Reparto titulo="Arquetipos" datos={j.arquetipos} nombre={(id) => ARQUETIPOS[id]?.nombre || id} color={(id) => colorArquetipo(id)} />
          <Reparto titulo="Míticas" datos={j.miticas} nombre={nombreMitica} color={() => "#e0503f"} />
          <Seccion titulo="Cartas que más coge">
            {cartas.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {cartas.map((c) => (
                  <div key={c.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
                    <Ficha id={c.id} />
                    <FilaBarra etiqueta={nombreCarta(c.id)} valor={c.partidas} max={maxCarta} color={carta(c.id).arquetipo ? colorArquetipo(carta(c.id).arquetipo) : "#a39b90"} texto={`${c.partidas}`} sub={`×${c.veces}`} />
                  </div>
                ))}
              </div>
            ) : <p className="ten peq">Todavía nada.</p>}
          </Seccion>
        </aside>
      </div>
    </>
  );
}
