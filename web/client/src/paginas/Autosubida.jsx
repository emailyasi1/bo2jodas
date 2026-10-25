import { useEffect, useState } from "react";
import { FolderOpen, FolderCheck, RefreshCw, Check, X } from "lucide-react";
import { elegirCarpeta, esBrave, permitir, quitarCarpeta, revisar, soportado, useAutosubida } from "../autosubida.js";
import { hace } from "../ui.jsx";

// Panel de la autosubida (pagina Subir): elegir la carpeta una vez y la web
// sube sola lo que falte mientras este abierta.
export default function Autosubida({ usuario }) {
  const a = useAutosubida();
  const [brave, setBrave] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    esBrave().then(setBrave);
  }, []);

  const accion = async (f) => {
    setError("");
    try {
      await f();
    } catch (e) {
      if (e && e.name === "AbortError") return; // cerro el dialogo
      setError(e.message || String(e));
    }
  };

  if (!soportado()) {
    return (
      <div className="panel panel-cuerpo autosubida">
        <h3><FolderOpen size={18} /> Subida automática</h3>
        {brave ? (
          <p className="mut">
            Brave bloquea el acceso a carpetas por defecto. Para activarlo, abre <code>brave://flags/#file-system-access-api</code>, ponlo en <b>Enabled</b>, reinicia el navegador y vuelve aquí.
          </p>
        ) : (
          <p className="mut">
            Tu navegador no permite leer carpetas del PC. Arrastra el JSON a mano, o abre esta web en <b>Chrome, Edge u Opera</b> para que las partidas se suban solas.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="panel panel-cuerpo autosubida">
      <h3>{a.carpeta ? <FolderCheck size={18} /> : <FolderOpen size={18} />} Subida automática</h3>
      {!a.carpeta ? (
        <>
          <p className="mut">
            Elige <b>una sola vez</b> la carpeta donde el mod guarda las partidas y, mientras tengas esta web abierta con tu cuenta, se subirán solas al acabar (también las que tengas pendientes). No hay que instalar ni ejecutar nada.
          </p>
          <div className="fila-acciones">
            <button type="button" className="boton" onClick={() => accion(elegirCarpeta)}><FolderOpen size={15} /> Elegir carpeta de partidas</button>
          </div>
          <p className="ten peq">En el diálogo, pega la ruta de la derecha en la barra de arriba y pulsa “Seleccionar carpeta”. El navegador solo lee esa carpeta.</p>
        </>
      ) : a.permiso !== "ok" ? (
        <>
          <p className="mut">Carpeta guardada: <b>{a.nombre}</b>. El navegador pide confirmar el acceso en esta visita.</p>
          <div className="fila-acciones">
            <button type="button" className="boton" onClick={() => accion(permitir)}><Check size={15} /> Permitir acceso a la carpeta</button>
            <button type="button" className="boton sec" onClick={() => accion(quitarCarpeta)}>Quitar carpeta</button>
          </div>
          <p className="ten peq">Si marcas “Permitir siempre” (Chrome y Edge), no lo volverá a pedir.</p>
        </>
      ) : (
        <>
          <p className="mut">
            Vigilando <b>{a.nombre}</b>: se comprueba cada minuto mientras esta web esté abierta, y cada vez que entres. Subes como <b>{usuario}</b>.
          </p>
          <div className="fila-acciones">
            <button type="button" className="boton sec peq" onClick={() => accion(revisar)} disabled={a.revisando}>
              <RefreshCw size={14} className={a.revisando ? "girando" : ""} /> {a.revisando ? "Comprobando…" : "Comprobar ahora"}
            </button>
            <button type="button" className="boton sec peq" onClick={() => accion(quitarCarpeta)}>Quitar carpeta</button>
            <span className="ten peq">
              {a.ultima ? `Última comprobación ${hace(a.ultima.toISOString())}` : "Todavía no se ha comprobado"}
              {a.subidas > 0 && ` · ${a.subidas} subida${a.subidas === 1 ? "" : "s"} en esta visita`}
            </span>
          </div>
          {a.registro.length > 0 && (
            <ul className="autosubida-registro">
              {a.registro.map((r, i) => (
                <li key={i} className={r.ok ? "estado-ok" : "estado-mal"}>{r.ok ? <Check size={14} /> : <X size={14} />} {r.texto}</li>
              ))}
            </ul>
          )}
          <p className="ten peq">Las terminadas se suben al momento. Una sin terminar se sube cuando el mod avisa de que esa partida ya no sigue (reinicio) o lleva 40 minutos sin dar señales (juego cerrado). Lo que ya está subido no se repite.</p>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
