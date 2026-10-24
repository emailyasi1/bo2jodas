import { Link } from "react-router-dom";
import { ArrowUpRight, Upload } from "lucide-react";
import { Cargando, Fallo, Seccion, Top, TagArquetipo, TagClase, TagMitica, hace, useDatos } from "../ui.jsx";
import { FilaPartida } from "./comun.jsx";
import { fmt } from "../nombres.js";

export default function Inicio() {
  const runs = useDatos("/runs?limit=12");
  const lb = useDatos("/leaderboards");
  const st = useDatos("/stats");

  const mejor = lb.datos?.mejorRonda?.[0];
  const jugadores = st.datos?.jugadores || [];
  const bajasTotales = jugadores.reduce((s, j) => s + j.bajas, 0);

  return (
    <>
      <section className="portada">
        <div>
          <span className="mayus ten">Black Ops II Zombies · Town · bo2jodas</span>
          {mejor ? (
            <>
              <h1>
                El récord está en la <em>ronda {mejor.ronda}</em>
              </h1>
              <div className="lead">
                <b style={{ color: "var(--tx)" }}>{mejor.nombre}</b>
                <TagClase id={mejor.clase} />
                <TagArquetipo id={mejor.arquetipo} />
                <TagMitica id={mejor.mitica} />
                <span className="ten">{hace(mejor.fecha)}</span>
              </div>
              <div className="acciones">
                <Link className="boton" to={`/partida/${mejor.partida}`}>Ver la partida <ArrowUpRight size={16} /></Link>
                <Link className="boton sec" to="/clasificacion">Clasificación</Link>
              </div>
            </>
          ) : lb.cargando ? (
            <h1>Cargando…</h1>
          ) : (
            <>
              <h1>Todavía no hay <em>partidas</em></h1>
              <div className="acciones"><Link className="boton" to="/subir"><Upload size={16} /> Subir la primera</Link></div>
            </>
          )}
        </div>
        {st.datos && (
          <dl className="cifras">
            <div><b>{fmt(st.datos.partidas)}</b><span>Partidas</span></div>
            <div><b>{fmt(jugadores.length)}</b><span>Jugadores</span></div>
            <div><b>{fmt(bajasTotales)}</b><span>Zombies muertos</span></div>
            <div><b>{fmt(st.datos.cartas.length)}</b><span>Cartas usadas</span></div>
          </dl>
        )}
      </section>

      <div className="rejilla">
        <Seccion titulo="Últimas partidas" extra={<Link to="/partidas" className="mut">Ver todas</Link>}>
          {runs.cargando && <Cargando />}
          {runs.error && <Fallo error={runs.error} />}
          {runs.datos && (runs.datos.length ? (
            <div className="partidas">{runs.datos.map((p) => <FilaPartida key={p.id} p={p} />)}</div>
          ) : (
            <p className="vacio">Aún no se ha subido ninguna partida.</p>
          ))}
        </Seccion>

        <aside style={{ display: "grid", gap: 20 }}>
          <Seccion titulo="Mejor ronda">
            {lb.datos ? (
              <Top
                titulo="Por jugador"
                filas={lb.datos.mejorRonda.slice(0, 8)}
                valor={(f) => f.ronda}
                texto={(f) => `R${f.ronda}`}
                enlace={(f) => `/jugador/${encodeURIComponent(f.nombre)}`}
              />
            ) : <Cargando filas={2} />}
          </Seccion>
          {lb.datos && lb.datos.historia.length > 0 && (
            <div className="panel">
              <div className="panel-cab"><h3>Historia del récord</h3><Link to="/clasificacion" className="ten peq">Todo</Link></div>
              <ol className="linea-tiempo">
                {lb.datos.historia.slice(0, 5).map((h) => (
                  <li key={h.partida + h.ronda}>
                    <div className="lt-cab">
                      <Link to={`/partida/${h.partida}`}><b>Ronda {h.ronda}</b></Link>
                      <span className="lt-sub">{hace(h.fecha)}</span>
                    </div>
                    <div className="lt-sub">
                      {h.nuevos.join(", ")}
                      {h.anterior > 0 ? ` supera la ${h.anterior}${h.anteriores.length ? ` de ${h.anteriores.join(", ")}` : ""}` : " abre el marcador"}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
