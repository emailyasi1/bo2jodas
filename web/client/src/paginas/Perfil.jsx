import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cambiarContrasena, tokenNuevo } from "../api.js";
import { useSesion } from "../sesion.jsx";

// Perfil: cuenta, como subir partidas, y el token de subida de la cuenta
// (32 caracteres) para quien prefiera el script automatico.
export default function Perfil() {
  const { yo, poner, salir } = useSesion();
  const navegar = useNavigate();
  const { state } = useLocation();
  const [verToken, setVerToken] = useState(false);
  const [aviso, setAviso] = useState("");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");

  useEffect(() => {
    if (yo === null) navegar("/entrar", { replace: true });
  }, [yo, navegar]);

  if (!yo) return <p className="cargando">Cargando…</p>;

  const origen = window.location.origin;
  const cfg = `# subir_partidas.cfg de ${yo.usuario}\nurl=${origen}\ntoken=${yo.token}\nnombre=${yo.usuario}\n`;
  const urlCfg = `data:text/plain;charset=utf-8,${encodeURIComponent(cfg)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(yo.token);
      setAviso("Token copiado.");
    } catch {
      setVerToken(true);
      setAviso("No se pudo copiar solo: selecciónalo y copia.");
    }
  }

  async function regenerar() {
    if (!window.confirm("El token actual dejará de valer y tendrás que cambiarlo en subir_partidas.cfg. ¿Seguir?")) return;
    try {
      poner(await tokenNuevo());
      setVerToken(true);
      setAviso("Token nuevo generado.");
    } catch (e) {
      setAviso(e.message);
    }
  }

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
          <summary>Subida automática con script (opcional)</summary>
          <div>
            <p className="mut">
              Si eres anfitrión a menudo, el script <code>subir_partidas.bat</code> de la carpeta{" "}
              <a href="https://github.com/emailyasi1/bo2jodas/tree/main/web/subidor" target="_blank" rel="noreferrer" style={{ color: "var(--lava)" }}>web/subidor</a>{" "}
              vigila la carpeta de partidas y sube cada una al acabar. Usa este token de tu cuenta:
            </p>
            <div className="token">{verToken ? yo.token : "•".repeat(32)}</div>
            <div className="fila-acciones">
              <button type="button" className="boton sec peq" onClick={() => setVerToken((v) => !v)}>{verToken ? "Ocultar" : "Mostrar"}</button>
              <button type="button" className="boton sec peq" onClick={copiar}>Copiar</button>
              <a className="boton peq" href={urlCfg} download="subir_partidas.cfg">Descargar subir_partidas.cfg</a>
            </div>
            <p className="ten peq">
              Es personal: lo que se suba con él aparece como subido por {yo.usuario}. Si se te escapa, genera otro y el viejo deja de valer.
            </p>
            <div><button type="button" className="boton texto peq" style={{ padding: 0 }} onClick={regenerar}>Generar un token nuevo</button></div>
          </div>
        </details>

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
