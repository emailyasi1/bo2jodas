import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { entrar, registrar } from "../api.js";
import { useSesion } from "../sesion.jsx";

// Registro y login: solo usuario y contrasena. Al registrarte se crea tu token
// de subida (32 caracteres), que ves en Perfil.
export default function Entrar({ registro = false }) {
  const [modo, setModo] = useState(registro ? "registro" : "login");
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [repetir, setRepetir] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { poner } = useSesion();
  const navegar = useNavigate();
  const esRegistro = modo === "registro";

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (esRegistro && contrasena !== repetir) return setError("Las contraseñas no coinciden.");
    setEnviando(true);
    try {
      const perfil = esRegistro ? await registrar(usuario.trim(), contrasena) : await entrar(usuario.trim(), contrasena);
      poner(perfil);
      navegar(esRegistro ? "/subir" : "/", { state: { nuevo: esRegistro } });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="acceso">
      <div className="pestanas">
        <button type="button" className={esRegistro ? "" : "activa"} onClick={() => setModo("login")}>
          Entrar
        </button>
        <button type="button" className={esRegistro ? "activa" : ""} onClick={() => setModo("registro")}>
          Registrarse
        </button>
      </div>
      <form className="panel panel-cuerpo formulario" onSubmit={enviar}>
        <h1 style={{ fontSize: 30 }}>{esRegistro ? "Crear cuenta" : "Entrar"}</h1>
        <label className="campo">
          Usuario
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            pattern="[A-Za-z0-9_]{3,20}"
            title="De 3 a 20 letras, números o _"
            required
            autoFocus
          />
        </label>
        <label className="campo">
          Contraseña
          <input
            type="password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            autoComplete={esRegistro ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </label>
        {esRegistro && (
          <label className="campo">
            Repite la contraseña
            <input type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} autoComplete="new-password" minLength={6} required />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "…" : esRegistro ? "Crear cuenta" : "Entrar"}
        </button>
        <p className="ten peq">
          {esRegistro
            ? "Solo hace falta usuario y contraseña. Con la cuenta creada ya puedes subir partidas."
            : "¿Sin cuenta? Pulsa Registrarse arriba."}
        </p>
      </form>
    </section>
  );
}
