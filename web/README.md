# bo2jodas web: partidas y leaderboards

Al acabar cada partida, el mod escribe un JSON con todo lo que ha pasado (jugadores, build, nivel, ronda, daño de cada carta, bajas, caídas, jefes…) en el PC del **anfitrión**:

```
%localappdata%\Plutonium\storage\t6\mods\zm_bo2jodas\scriptdata\bo2jodas_partidas\zm_transit_<id>.json
```

Esta web lo recibe, lo guarda y lo enseña: lista de partidas, detalle de cada una (build, daño por carta, armas, cartas por orden, cartas perdidas), leaderboards (mejor ronda de cada uno, por clase, por arquetipo, récords, y la historia de quién le quitó el récord a quién) y totales por jugador.

**Para los jugadores no hay que instalar nada**: la web vive en un servidor y se les pasa la URL. Cada uno se registra (solo usuario y contraseña), entra, y en **Subir JSON** arrastra la partida que quiera subir desde la carpeta de arriba (del PC de quien hizo de anfitrión). Las repetidas no se duplican y cada partida queda marcada con quién la subió.

- `server/`: Node + Express. API en `/api`. Guarda partidas y cuentas en Postgres si hay `DATABASE_URL`, o en archivos dentro de `data/` si no.
- `client/`: React + Vite.
- `Dockerfile`, `docker-compose.yml`, `Caddyfile`: despliegue con HTTPS automático.

## Desplegar gratis en Render + Neon (recomendado)

Render da el servidor web gratis, pero su disco se borra en cada reinicio y el servicio se duerme tras 15 minutos sin visitas (la primera visita después tarda en torno a un minuto). Por eso los datos van a una base de datos Postgres gratuita de **Neon**, que no caduca (la Postgres gratis de Render se borra a los 30 días).

1. **Neon** (neon.tech): crea una cuenta y un proyecto. Región: la misma que en Render (por ejemplo AWS Frankfurt). Copia la *connection string* (`postgresql://usuario:clave@ep-....neon.tech/neondb?sslmode=require`). La tabla la crea el servidor solo.
2. **Render**: New, Web Service, conecta el repositorio `emailyasi0-a11y/bo2jodas` y rellena:

| Campo | Valor |
|---|---|
| Language | Docker |
| Branch | `main` |
| Region | Frankfurt (EU Central), la misma que Neon |
| Root Directory | `web` |
| Dockerfile Path | `./Dockerfile` (Render lo muestra como `web/./Dockerfile`) |
| Instance Type | Free |
| Variable `DATABASE_URL` | la connection string de Neon |
| Variable `SESSION_SECRET` | botón *Generate* |
| Health Check Path (Advanced) | `/api/salud` |

No hacen falta `PORT`, `DOMINIO` ni Caddy: Render pone el puerto y el HTTPS. La URL queda como `https://bo2jodas.onrender.com`. Cada push a `main` que toque `web/` vuelve a desplegar solo.

## Desplegar en un servidor (VPS con IP pública)

Hace falta Docker. Sin comprar dominio: **sslip.io** convierte la IP en nombre (`203.0.113.7.sslip.io` apunta a `203.0.113.7`) y Caddy pide el certificado solo.

```bash
git clone https://github.com/emailyasi0-a11y/bo2jodas
cd bo2jodas/web
cp .env.example .env        # DOMINIO=<tu ip>.sslip.io
docker compose up -d --build
```

En un Ubuntu recién creado (por ejemplo una VM Always Free de Oracle) lo hace todo `instalar_servidor.sh`. Abre `https://<tu ip>.sslip.io`. Los puertos 80 y 443 tienen que estar abiertos en el firewall del servidor. Sin `DATABASE_URL`, todo lo persistente está en `web/data/` (`runs/` partidas, `usuarios/` cuentas, `config/` firma de sesión): haz copia de esa carpeta y no pierdes nada.

**Cuentas y tokens**: registro y login piden solo usuario y contraseña (contraseñas con scrypt, sesión en cookie firmada, freno de 15 intentos por IP cada 10 minutos). Al registrarse, cada cuenta recibe un token de subida de 32 caracteres que se ve en **Perfil**. Para subir vale cualquiera de las dos cosas: la sesión de la web (arrastrar el JSON en Subir JSON) o ese token en la cabecera `x-token` (lo usa el script opcional). Sin cuenta no se puede subir. Si un token se filtra, en Perfil se genera otro y el viejo deja de valer. `UPLOAD_TOKENS` en `.env` o `data/tokens.json` admiten tokens sueltos de administrador, pero no hacen falta.

Sin Docker: `cd client && npm install && npm run build`, luego `cd ../server && npm install && node src/index.js` (puerto 3000) y pon Caddy delante con el `Caddyfile`.

## Subida automática (sin scripts)

En *Subir partida* el usuario elige una vez la carpeta de partidas (File System Access API: Chrome, Edge, Opera, Vivaldi; Brave tras `brave://flags/#file-system-access-api`). `client/src/autosubida.js` guarda el handle en IndexedDB, revisa la carpeta al entrar y cada minuto con la sesión del usuario, y sube lo que falte: las terminadas al momento; las sin terminar según `en_partida.txt`, el latido que el mod escribe cada minuto (id y estado): si es de otra partida o dice "acabada" se sube, si lleva 40 min parado también, y si no se espera. Sin latido, 40 min sin cambiar el JSON.

## Probar en local

```bash
cd web/client && npm install && npm run build
cd ../server && npm install && node src/index.js
```

Abre `http://localhost:3000`. Para desarrollo del cliente con recarga: `npm run dev` en `client/` (proxy a `localhost:3000`).

Hay una partida de ejemplo en `ejemplos/`: `curl -X POST localhost:3000/api/runs -H "content-type: application/json" -H "x-token: <token de tu perfil>" --data @ejemplos/partida_ejemplo.json`. En local, `UPLOAD_OPEN=1 node src/index.js` acepta subidas sin token.

## API

| Método y ruta | Qué hace |
|---|---|
| `POST /api/runs` | Sube una partida (JSON del mod). Con sesión o con cabecera `x-token` (token de la cuenta). Devuelve `{ok, id, repetida}`. |
| `GET /api/runs?limit=100` | Resúmenes, las más recientes primero. |
| `GET /api/runs/:id` | La partida completa. |
| `GET /api/leaderboards` | Mejor ronda por jugador, por clase y por arquetipo; récords; historia del récord. |
| `GET /api/stats` | Totales por jugador y cartas más usadas. |
| `POST /api/auth/registro`, `POST /api/auth/login` | `{usuario, contrasena}`. Devuelven el perfil y ponen la cookie de sesión. |
| `GET /api/auth/yo` | Perfil: usuario, token de subida, fecha de alta, partidas subidas. |
| `POST /api/auth/token` | Genera un token nuevo (el anterior deja de valer). |
| `POST /api/runs/comprobar` | `{ ids: [...] }` (ids del mod, hasta 500): qué hay ya de cada uno, `{ id: { terminada, ronda } }`. Lo usa la autosubida para no mandar partidas repetidas. |
| `POST /api/auth/contrasena` | `{actual, nueva}`. |
| `POST /api/auth/logout` | Cierra la sesión. |
| `GET /api/salud` | Health check: `{ok, partidas, cuentas}`. |
| `DELETE /api/runs/:id` | Borra una partida (solo administradores: `lalay` y los de la variable `ADMINS`). Queda una línea en `borrado` con qué, quién y cuándo. |
| `GET /api/jugadores/:nombre` | Perfil de un jugador: totales, cartas favoritas y sus partidas. |

El formato del JSON lo escribe `mod/scripts/zm/bo2jodas_stats.gsc`; los nombres de las cartas para la web salen de `tools/generar_cartas_json.py` (hay que ejecutarlo cuando cambien las cartas del mod).

## Calculadora

`/calculadora`: vida de cada enemigo y zombies por ronda, y un simulador de build (clase, mítica, arma, zona, distancia, situación y hasta 15 cartas, 20 con Pistolas) que calcula disparo a disparo cuánto hace cada cosa a zombies, tanques y jefes. El motor (`client/src/calc/motor.js`) copia las funciones del mod y del juego, cada una con el nombre de la original en un comentario. Los números salen de `client/src/calculadora.json`, que genera `tools/generar_calculadora.py` (repo del mod) a partir de los scripts y de los archivos de arma volcados del juego: hay que volver a generarlo cuando cambien cartas, configuración o armas.
