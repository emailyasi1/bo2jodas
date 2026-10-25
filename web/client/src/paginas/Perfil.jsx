import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cambiarContrasena } from "../api.js";
import { useSesion } from "../sesion.jsx";

// Perfil: cuenta y cambio de contrasena.
export default function Perfil() {
  const { yo, poner, salir } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [aviso, setAviso] = useState("");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");

  useEffect(() => {
    if (yo === null) navegar("/entrar", { replace: true });
  }, [yo, navegar]);

  if (!yo) return <p className="cargando">Cargando…</p>;

  async function cambiar(e) {
    e.preventDefault();
    try {
      await cambiarContrasena(actual, nueva);
      setActual("");
      setNueva("");
      setAviso("Contraseña cambiada.");
    } catch (err) {
      setAviso(err.message);
    }
  }

  return (
    <>
      <div className="pagina-cab">
        <div>
          <span className="mayus ten">Tu cuenta</span>
          <h1>{yo.usuario}</h1>
          <p className="mut">
            Desde el {new Date(yo.creado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })} · {yo.subidas} partida{yo.subidas === 1 ? "" : "s"} subida{yo.subidas === 1 ? "" : "s"}
          </p>
        </div>
        <div className="fila-acciones">
          <Link className="boton" to="/subir">Subir una partida</Link>
          <Link className="boton sec" to={`/jugador/${encodeURIComponent(yo.usuario)}`}>Mi ficha de jugador</Link>
          <button type="button" className="boton texto" onClick={async () => { await salir(); navegar("/"); }}>Salir</button>
        </div>
      </div>

      {state?.nuevo && <p className="aviso" style={{ marginBottom: 18 }}>Cuenta creada. Ya puedes subir partidas.</p>}
      {aviso && <p className="aviso" style={{ marginBottom: 18 }}>{aviso}</p>}

      <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
        <details className="plegable">
          <summary>Cambiar la contraseña</summary>
          <div>
            <form className="formulario" onSubmit={cambiar} style={{ maxWidth: 380 }}>
              <label className="campo">
                Contraseña actual
                <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} autoComplete="current-password" required />
              </label>
              <label className="campo">
                Nueva contraseña
                <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" minLength={6} required />
              </label>
              <div><button type="submit" className="boton">Cambiar</button></div>
            </form>
          </div>
        </details>
      </div>
    </>
  );
}
