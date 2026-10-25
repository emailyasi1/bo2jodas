import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, FileUp, Check, X } from "lucide-react";
import { subirPartida } from "../api.js";
import { vaciarCache } from "../ui.jsx";
import { useSesion } from "../sesion.jsx";
import Autosubida from "./Autosubida.jsx";

const CARPETA = "%localappdata%\\Plutonium\\storage\\t6\\mods\\zm_bo2jodas\\scriptdata\\bo2jodas_partidas";

// Subida de partidas: cada uno entra con su cuenta y arrastra el JSON que deja
// el mod en el PC del anfitrion al acabar la partida.
export default function Subir() {
  const [estados, setEstados] = useState([]);
  const [copiado, setCopiado] = useState(false);
  const [sobre, setSobre] = useState(false);
  const { yo } = useSesion();
  const navegar = useNavigate();

  async function procesar(archivos) {
    setEstados([]);
    let ultimo = null;
    for (const f of archivos) {
      try {
        const json = JSON.parse(await f.text());
        const r = await subirPartida(json);
        setEstados((e) => [...e, { ok: true, t: r.repetida ? `${f.name}: ya estaba subida` : `${f.name}: subida` }]);
        ultimo = r.id;
      } catch (e) {
        setEstados((x) => [...x, { ok: false, t: `${f.name}: ${e.message}` }]);
      }
    }
    vaciarCache();
    if (archivos.length === 1 && ultimo) navegar(`/partida/${ultimo}`);
  }

  async function copiarRuta() {
    try {
      await navigator.clipboard.writeText(CARPETA);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sin portapapeles: la ruta se puede seleccionar a mano */
    }
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Partidas</span>
          <h1>Subir una partida</h1>
          <p className="mut">El mod guarda un JSON al acabar cada partida en el PC de quien hizo de anfitrión. Cada uno sube las que quiera; si una ya estaba, no se duplica. Las que acaban antes de la ronda 10 van a Resets y no cuentan para la clasificación.</p>
        </div>
      </div>

      <div className="rejilla">
        <div>
          {yo === undefined ? null : yo ? (
            <>
              <Autosubida usuario={yo.usuario} />
              <p className="mayus ten" style={{ margin: "22px 0 8px" }}>O a mano</p>
              <label
                className={sobre ? "zona-soltar sobre" : "zona-soltar"}
                onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
                onDragLeave={() => setSobre(false)}
                onDrop={(e) => { e.preventDefault(); setSobre(false); procesar([...e.dataTransfer.files]); }}
              >
                <FileUp size={30} strokeWidth={1.6} />
                <span><b style={{ color: "var(--tx)" }}>Arrastra aquí los .json</b> o pulsa para elegirlos</span>
                <span className="ten peq">Subes como {yo.usuario}</span>
                <input type="file" accept=".json,application/json" multiple hidden onChange={(e) => procesar([...e.target.files])} />
              </label>
              {estados.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 6 }}>
                  {estados.map((s, i) => (
                    <li key={i} className={s.ok ? "estado-ok" : "estado-mal"} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {s.ok ? <Check size={15} /> : <X size={15} />} {s.t}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="panel panel-cuerpo" style={{ display: "grid", gap: 12 }}>
              <h3>Hace falta una cuenta</h3>
              <p className="mut">Solo usuario y contraseña. Así cada partida queda con el nombre de quien la subió.</p>
              <div className="fila-acciones">
                <Link className="boton" to="/registro">Crear cuenta</Link>
                <Link className="boton sec" to="/entrar">Ya tengo cuenta</Link>
              </div>
            </div>
          )}
        </div>

        <aside className="panel panel-cuerpo" style={{ display: "grid", gap: 14 }}>
          <h3>Dónde está el archivo</h3>
          <ol className="pasos">
            <li>Al acabar la partida, el juego enseña “Partida guardada” con el nombre del archivo.</li>
            <li>
              En el PC del anfitrión, pega esta ruta en la barra del Explorador de Windows:
              <div className="token" style={{ fontSize: 13, marginTop: 8 }}>{CARPETA}</div>
              <button type="button" className="boton sec peq" style={{ marginTop: 8 }} onClick={copiarRuta}>
                {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? "Copiada" : "Copiar ruta"}
              </button>
            </li>
            <li>Arrastra el archivo que empieza por <code>zm_transit_</code> al recuadro.</li>
          </ol>
          <p className="ten peq">Con la subida automática de arriba no hace falta nada más. Si prefieres que se suban sin tener el navegador abierto, en tu <Link to="/perfil" style={{ color: "var(--lava)" }}>perfil</Link> hay un script opcional.</p>
        </aside>
      </div>
    </>
  );
}
