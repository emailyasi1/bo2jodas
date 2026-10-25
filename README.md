# bo2jodas

**Versión actual: 1.10.3** · Black Ops II Zombies · Plutonium T6 · Pueblo (funciona en el resto de mapas)

---

## Instalar

1. Ve a [Releases](../../releases) y descarga el zip de la última versión.
2. Descomprímelo y copia la carpeta `zm_bo2jodas` dentro de `%localappdata%\Plutonium\storage\t6\mods\` (crea `mods` si no existe). Si ya tenías una versión anterior, **sustitúyela entera**.
3. En el juego: **Zombies → Mods → bo2jodas**. El juego se reinicia con el mod cargado.
4. **Una sola vez**, en la consola, asigna la tecla de la lista de cartas: `bind h +actionslot 2` (la H o la que quieras).

Todos los jugadores de la partida necesitan **la misma versión**.

Diagramas de los arquetipos, sus cartas, la vida de los zombies por ronda y el daño de cada carta: [ARQUETIPOS.md](ARQUETIPOS.md).

---

## Novedades de la 1.10.3: estadísticas para balancear, resets y nuevas clasificaciones

**El JSON de cada partida trae mucho más**, para balancear y encontrar fallos:

| | Qué se guarda |
|---|---|
| **Caídas** | Cada caída con su ronda, el segundo, **qué te tumbó** (zombie, tanque, Brutus, Bruja, Leroy, caída, fuego, tu propia explosión...), quién te levantó o si te desangraste. Ronda de la primera caída del equipo y qué acabó la partida. |
| **Ronda a ronda** | Duración de cada ronda, máximo de zombies vivos a la vez y, por jugador, bajas, puntos, daño, caídas y nivel en cada ronda. Segundo en el que empieza la **ronda 30, 50, 100 y 200**. |
| **Economía** | De dónde salen los puntos (bajas, clase, cartas, Mercenario...) y en qué se gastan (caja, Bruja, torretas...), usos de la caja. |
| **Armas y clase** | Tiempo con cada arma en la mano, disparos, impactos y cabezas por arma, bajas rematadas por la clase (Ejecutor), racha máxima, armas especiales y en qué ronda, bebidas por ronda, daño recibido por fuente. |
| **Jefes y torretas** | Cada jefe con su ronda, cuánto duró, si murió, quién lo remató, cartas robadas y recuperadas, toques de la Bruja y daño de cada jugador. Torretas: colocadas, bajas, roturas, reparaciones, rebotes y morteros. |
| **Técnico** | Zombies atascados recolocados o muertos, limpiezas de textos, quién se salió y en qué ronda, y los **dvars `jodas_*` cambiados** (las partidas con dvars de prueba se marcan como **Prueba** y no entran en la clasificación). |

En la web, cada partida enseña **gráficas por ronda** (bajas, puntos, daño y nivel de cada jugador; duración de cada ronda), la tabla de caídas, el daño recibido, puntos ganados y gastados, jefes y torretas.

**Resets**: las partidas que acaban **antes de la ronda 10** ya no se tiran, van a la página nueva **Resets** y no cuentan para la clasificación ni los totales (sustituye al filtro de nivel 10). El mod guarda el JSON **al acabar cada ronda**, así que una partida reiniciada con `fast_restart` o `map_restart` también queda guardada hasta la última ronda terminada (sale como *Sin terminar*).

**Clasificación con categorías**: **High Rounds** (la de siempre), **Flawless** (hasta qué ronda llegó el grupo sin que nadie cayera) y **Speedrun R30 / R50 / R100 / R200** (tiempo hasta que empieza esa ronda). Flawless y speedrun solo cuentan partidas desde esta versión.

**Actualiza el script de subida** (`web/subidor/subir_partidas.ps1`) si lo usas: el nuevo espera a que la partida acabe (o lleve 10 minutos sin cambiar) antes de subirla. El viejo subiría el JSON en cada ronda y se comería el límite de 20 subidas por hora.

**Cambios de juego**:

| | Antes | Ahora | |
|---|---|---|---|
| **Pistolas: huecos de carta** | 20 | **15**, como el resto | 🔻 NERF |
| **Pistolas: carta inicial** | Trébol legendario | **Trébol épico** | 🔻 NERF |
| **Ray Gun Mark II** | Salía en el sorteo de armas especiales (8 %, la mitad de las veces) | **1 % fijo por ronda**; el sorteo de especiales de Pistolas ya solo da la Ray Gun | 🔻 NERF |
| **Buscador de botín** | Tope 15 % | **Tope 5 %** | 🔻 NERF |
| **Caja misteriosa** | Desde la tirada 39 costaba más de 1.000.000 y no se podía usar nunca más (el juego no deja pasar de 1.000.000 de puntos) | El precio deja de subir en **999.999** | 🔧 ARREGLO |

**Arreglo**: con Leroy vivo, la tercera carta del menú podía salir en blanco (se llenaba el tope de elementos de pantalla). El nivel, las bajas para la siguiente carta y la ayuda del menú usan ahora menos elementos.

## Novedades de la 1.10.2: zombies atascados fuera del mapa

- **Super sprinters atascados en las ventanas** (pasaba desde la 1.6): Pueblo no tiene animación para cruzar una ventana en super sprint, así que el super sprinter que llegaba a una ventana se quedaba fuera del mapa para siempre (parecía que salían lejísimos y la ronda no acababa). Ahora nacen en sprint y **aceleran a super sprint al entrar** en el mapa.
- **Zombies recolocados**: el zombie que lleva 15 s atascado y reaparece detrás de un jugador ya no vuelve a su ventana, ataca normal y **libera su hueco en la ventana** (antes esa ventana quedaba bloqueada y los siguientes zombies esperaban fuera). Si no hay sitio donde ponerlo, muere en vez de borrarse.

Con 31 zombies vivos es normal que alguno espere un rato fuera a que quede libre un hueco en su ventana; lo que ya no debería pasar es que se quede ahí para siempre.

## Novedades de la 1.10.1: balance de clases

Automáticas era de largo la mejor clase. Esta versión es para **probar las cuatro clases**: cada una tiene ahora una identidad clara, ninguna puede recibir un arma que no sirva y todas sacan **los mismos puntos por zombie**.

### Por qué Automáticas ganaba

- **Era la única sin lotería**: sus 20 armas sirven todas. Rifles tenía 2 armas que casi no matan (M14 y SMR) y Pistolas 3 (M1911 y C96 hacen 20 de daño, y el cuchillo balístico), así que 1 de cada 4 rondas te tocaba un arma inútil.
- **Su ventaja era gratis y su desventaja no existía**: la racha sube sola disparando, y gastar 2 balas da igual cuando el arma se renueva cada ronda.
- **Los puntos van por impacto**: el juego da 10 puntos por cada impacto que no mata. Automáticas necesita muchos más impactos por zombie, así que cobraba bastante más por cada baja que Escopetas o Pistolas, y con más puntos tenía más caja, más cartas y más bebidas.
- **Rifles no tenía identidad**: su +30 % / −10 % salía a un +10 % de media.

### Bonus de puntos por baja

Escopetas, Pistolas y Rifles cobran un **extra por cada baja**, un % de la vida máxima del zombie. Se ha calculado con el daño real de cada arma (perdigones, cadencia, rearme de cerrojo, cargador, munición y recarga), la vida de los zombies del mod y la ventaja de cada clase. Puntos por zombie (mediana de las armas de cada clase, sin cartas):

| Clase | Ronda 5 | Ronda 10 | Ronda 20 | Ronda 30 | Bonus |
|---|---|---|---|---|---|
| Automáticas | 110 | 160 | 420 | 1290 | — |
| Escopetas | 75 → **128** | 78 → **182** | 79 → **431** | 79 → **1276** | 7.5 % de la vida |
| Pistolas | 75 → **111** | 90 → **161** | 175 → **416** | 470 → **1288** | 5.1 % de la vida |
| Rifles | 110 → **111** | 160 → **162** | 410 → **416** | 1270 → **1290** | 0.13 % de la vida |

Rifles casi no lo necesita: sus balas pegan poco y ya cobraban como Automáticas. Su problema era matar, y eso lo arregla el Ejecutor. El extra se divide entre tus cartas de **Calibre y Gatillo loco** (con ellas Automáticas también necesita menos impactos) y no cuenta con el jefe.

### Notas del parche

| Clase | Cambio | Antes | Ahora | |
|---|---|---|---|---|
| **Automáticas** | Racha de daño por tiro seguido (tope) | +20 % | **+15 %** | 🔻 NERF |
| **Automáticas** | Probabilidad de gastar 2 balas | 15 % | **25 %** | 🔻 NERF |
| **Escopetas** | Velocidad de movimiento | −10 % | **−5 %** | 🔺 BUFF |
| **Escopetas** | Recarga | Normal | **Speed Cola de clase** (la mitad de tiempo) | 🔺 BUFF |
| **Escopetas** | Bonus de puntos por baja | — | **7.5 %** de la vida del zombie | 🔺 BUFF |
| **Rifles** | Ventaja de clase | +30 % a heridos, −10 % a sanos | **Ejecutor**: la bala que deja al zombie por debajo del 20 % de su vida lo remata (no al jefe) | 🔄 REWORK |
| **Rifles** | SMR | 80 de daño por bala | **320** (×4) | 🔺 BUFF |
| **Rifles** | Bonus de puntos por baja | — | **0.13 %** de la vida del zombie | 🔺 BUFF |
| **Pistolas** | M1911 y Mauser C96 | Sin mejorar (20 de daño) | **Siempre mejoradas**: Mustang & Sally y Boomhilda | 🔺 BUFF |
| **Pistolas** | Cuchillo balístico | En la lista de armas | **Fuera** | 🔺 BUFF |
| **Pistolas** | Carta inicial | — | **Trébol LEGENDARIO** al elegir la clase | 🔺 BUFF |
| **Pistolas** | Bonus de puntos por baja | — | **5.1 %** de la vida del zombie | 🔺 BUFF |
| **Todas** | Primera carta | 15 bajas | **9 bajas** (los zombies de la ronda 1); cada nivel sigue costando 5 más: 9, 23, 42, 66, 95… | 🔺 BUFF |

### Arreglos

- **Torreta del Mecánico**: no se podía recoger ni reparar (no salía el texto y USAR no hacía nada). Ahora sí: mantén USAR junto a tu torreta.
- **Torreta del Mecánico**: suenan el arranque, el zumbido, la ráfaga y el apagado (el banco de sonido de Pueblo no los traía) y sus balas no hacen daño a ningún jugador.

Todo se puede ajustar por consola para probar: ver [Consola](#consola-para-probar).

<details>
<summary><b>Novedades de la 1.10.0: el Mecánico</b></summary>

**Arquetipo nuevo: Mecánico.** Construye **torretas** que disparan solas, y sus cartas mejoran las torretas, no a ti.

- **Colocar**: con la carta **Caja de herramientas** recibes el kit de la torreta en la **tecla de acción 1** (la que indica el juego al recibirlo; en mando, cruceta arriba). Al sacarlo sale el fantasma de colocación de TranZit (verde / rojo) y al disparar se planta en el suelo. No necesita electricidad ni turbina.
- **Disparo**: cada bala hace el **6 % de la vida de un zombie de la ronda** (nunca menos de 300), cargador de 30 y 4 s de recarga. Apunta sola al zombie más cercano que ve.
- **Bajas**: son tuyas. **Dan puntos** y cuentan **×0.75** para subir de nivel (los efectos de baja de tus cartas, como Vampiro o Cinta de balas, no saltan con ellas).
- **Desgaste**: a las **100 bajas** la torreta se rompe (deja de disparar y echa chispas). Mantén **USAR** junto a ella para **repararla por 2500**.
- **Recoger**: mantén **USAR** junto a tu torreta para recogerla y ponerla en otro sitio. Conserva su desgaste.
- **Seguras**: sus balas **no hacen daño a ningún jugador** y **los zombies no van a por ellas**.
- Si pierdes la Caja de herramientas (al caer o porque te la roba Leroy), tus torretas desaparecen.

| Carta | Efecto | Valores | Tope |
|---|---|---|---|
| **Caja de herramientas** (base) | Puedes construir 1 torreta. Sin ella las demás no hacen nada. Siempre RARA, una sola vez | — | 1 |
| **Engranajes** | Tus torretas disparan +% más rápido | 10 / 15 / 22 / 30 / 42 % | 100 % |
| **Recarga rápida** | Tus torretas recargan en −% de tiempo | 10 / 15 / 22 / 30 / 40 % | 70 % |
| **Calibre .50** | +% de daño por bala de tus torretas | 15 / 25 / 35 / 50 / 70 % | 200 % |
| **Rebote** | % de que la bala salte al zombie más cercano (4 m) con el 60 % del daño | 10 / 15 / 22 / 30 / 40 % | 80 % |
| **Cadena de montaje** | +1 torreta, hasta 3. Siempre RARA | — | 2 |
| **Mortero** (firma) | Requiere Calibre .50 + Cadena de montaje. Cada 8 s cada torreta lanza un mortero al zombie que tenga más zombies alrededor: 250 % del daño de una bala en 1.6 m | — | — |

**Leroy**: roba como mucho **3 cartas a cada jugador**. En cooperativo, cuando ya le ha robado 3 a uno, va directo a por otro; si no puede robar a nadie (o en solo), solo pega. Los cuencos de caramelos duran **15 s** (antes 30).

#### Arreglos de la 1.10.0

- **Jefes que no pegaban**: si el zombie que se convertía en jefe venía por una ventana, el juego lo seguía mandando a la ventana y nunca le dejaba atacar (Leroy corría detrás de ti sin pegar, y le pasaba a todos los jefes mientras estuvierais en una zona con ventanas). Ahora el jefe sale del suelo o la ventana, aparece en la lava y ataca siempre.
- **Overflow de textos**: el juego guarda cada texto distinto que sale en pantalla y no lo libera; en partidas largas se llenaba y la partida se cerraba (pasó al recoger varios cuencos de Leroy a la vez). Ahora el mod vacía esa tabla sola cada 100 textos nuevos (`jodas_textos_limite`) y vuelve a escribir lo que hay en pantalla, así que no debería volver a pasar dure lo que dure la partida.

</details>

<details>
<summary><b>Novedades de la 1.9.2: estadísticas y web</b></summary>

Al acabar cada partida, el mod escribe un **JSON con todo lo que ha pasado** en el PC del anfitrión (`%localappdata%\Plutonium\storage\t6\mods\zm_bo2jodas\scriptdata\bo2jodas_partidas\`): por jugador, clase, arquetipo, mítica, nivel, build completa, cartas por orden, **daño de cada carta** (cada disparo se reparte entre el arma y las cartas según lo que cada una puso en el multiplicador; el fuego, los rayos y los leapers cuentan por su carta), daño y bajas por arma, bajas, cabezas, caídas, reanimaciones, combo máximo, puntos, rerolls, bloqueos, saltos, cartas perdidas, jefes rematados y bebidas de la Bruja; y de la partida: ronda, duración, jefes aparecidos y muertos, bastones construidos y forjados.

**Web de partidas: [bo2jodas.onrender.com](https://bo2jodas.onrender.com)**. Lista de partidas, detalle de cada una, leaderboards (mejor ronda de cada uno, por clase, por arquetipo, récords y la historia de quién le quitó el récord a quién) y totales por jugador. No hay que instalar nada:

1. Regístrate en la web (solo usuario y contraseña).
2. Al acabar una partida, quien hizo de anfitrión tiene el JSON en la carpeta de arriba (el juego lo avisa en pantalla).
3. En **Subir JSON**, arrastra la partida que quieras subir. Las repetidas no se duplican y cada partida queda con el nombre de quien la subió. Las partidas que acaban **antes de la ronda 10** van a la página **Resets** (desde la 1.10.3).

La web comprueba cada partida antes de guardarla: solo se quedan los campos que escribe el mod (lo demás se descarta), cada número tiene que estar en su rango, las cartas, armas, clases y arquetipos tienen que existir y no pasar de su tope, y los números tienen que cuadrar entre sí (nivel con bajas, bajas con los zombies que salen hasta esa ronda, bajas por arma con el total, duración posible, huecos de carta de la clase). Si algo no cuadra, dice el motivo. Como mucho **1 MB** por archivo, **20 subidas por hora** por cuenta y **3 cuentas nuevas por conexión al día**.

**Efectos con tus cartas de daño**: rayos (Pararrayos, Sobrecarga, Condensador, Tormenta) y fuego ahora también se multiplican por Calibre, Gatillo loco, Adrenalina, Cuerpo de cristal y demás, como ya hacían Espinas, Ciclón, los leapers y la Reacción en cadena. El fuego dura **6 tics** del 4 % (antes salían 5). Las estadísticas ya no cuentan dos veces el daño de Espinas, Ciclón, leapers, Reacción en cadena, Zeus, Fénix y Electric Cherry.

**Al elegir carta**, cada carta dice cuánto tienes ya de ella ("Ya tienes: +22pct x2") y tu lista se ve abajo a tamaño normal.

Si eres anfitrión a menudo, `web/subidor/` las sube solas con el token de tu perfil. El código de la web está en [`web/`](web/) (Node + React; instrucciones de despliegue en [web/README.md](web/README.md)).

</details>

<details>
<summary><b>Novedades de la 1.9.1</b></summary>


| | |
|---|---|
| **Goo de la Sliquifier** | Las bajas de leapers, fuego, rayos, Espinas, Fénix y Reacción en cadena ya no cuentan como disparos de la Sliquifier (ni del Bastón) cuando la llevas en la mano: el goo solo se contagia con las bajas de la propia Sliquifier. |
| **Cartas a la vista** | Mientras eliges carta, tu lista de cartas se ve abajo de la pantalla. |
| **Suertudo** | Buscador de botín ×2 (0.4 a 3.2 %). Pata de conejo da 1 / 2 / 2 / 3 / 4 rerolls y +1 cada 3 niveles. Dados 15 a 60 %. **Amuleto** nuevo: % de ver **4 cartas** en vez de 3. Herradura 20 a 80 %. Jackpot además no gasta la mitad de los rerolls. |
| **Zombies atascados** | Un zombie quieto 15 s sin nadie cerca (típico detrás de una ventana) reaparece detrás de un jugador. |
| **Contador** | Arriba pone los zombies que quedan de la ronda, no los vivos. |
| **Bloqueo** | Solo **1 bloqueo** por partida (`jodas_bloqueos`). |
| **No coger carta** | Ahora con **Cuchillo**; se elige solo con Usar (F / X). |
| **Bruja** | Sus bebidas no cuentan para el límite de 4 de las máquinas: puedes llegar a tenerlas todas (como con el fantasma de Buried). Solo te da carta cuando ya tienes sus cinco. `jodas_bebidas_max` pone tope si quieres. |

<details>
<summary><b>Novedades de la 1.9.0</b></summary>


La versión de las **builds**: hasta ahora cogías cartas sueltas; ahora eliges un **arquetipo** y montas algo con sentido. Además, tres jefes distintos, bebidas que no se pueden comprar, menús nuevos y zombies más duros.

| | Qué hay de nuevo |
|---|---|
| **Arquetipos** | En el nivel 8 eliges 1 de 3 entre **10 arquetipos**; cada uno tiene **6 cartas propias** (una es la **firma**, una sinergia que solo aparece con dos cartas concretas). 43 cartas nuevas. |
| **Tres jefes** | Brutus, la **Bruja** (aparece detrás de ti, no la dejes tocarte) y **Leroy** (te roba cartas y te las devuelve mejoradas). Nacen en el charco de lava del centro. |
| **Bebidas nuevas** | La Bruja regala **Mule Kick, Deadshot, PhD Flopper, Electric Cherry y Tombstone**, con icono en la barra. |
| **Mítica Hora bruja** | Cada 3 minutos, 10 s de zombies a cámara lenta para todo el equipo. Sustituye al Leaper, que ahora es del Domador. |
| **Menús nuevos** | Marco del color de la rareza, fondo del color del arquetipo, la carta marcada crece, fundidos y título descifrándose. |
| **Tanque y Pistolas** | Tanque: vida ×2 con Juggernog y escudo en la espalda cada ronda. Pistolas: **15 huecos** de carta. |
| **Zombies más duros** | Vida base +25 % y escalado mayor por ronda, para que la build se note y no vayáis sobrados. |
| **4 cartas generales nuevas** | Armadura, Sangre fría, Médico y Madrugador: ocupan hueco y valen para cualquier build. |
| **La forja de Pueblo** | Ritual de tres pasos para mejorar el Bastón de fuego al de Origins (Kagutsuchi, con disparo cargado). Ver [La forja de Pueblo](#la-forja-de-pueblo-mejorar-el-bastón). |
| **15 huecos de carta** | 15 para todos (Pistolas 20). Las cartas de equipo (Monos, Claymores, Semtex, EMP) ya no ocupan hueco. Si pierdes una al caer o te la roba Leroy, pierdes también el equipo. |
| **Saltar carta** | En el menú de cartas, **Saltar** (Espacio / A) gasta la subida sin coger nada. |
| **Medalla** | Ahora sube de nivel de verdad: 1 a 3 niveles al momento, con sus cartas. No ocupa hueco. |
| **Partidas de 5 o más** | Cada jugador por encima de 4 suma un 20 % de zombies por ronda (el tope de 31 vivos a la vez es del motor). |
| **Balance** | Mochila 5 / 8 / 12 / 18 / 30 balas por minuto (tope 60). Cinta de balas 2 / 3 / 4 / 6 / 8 (tope 20). |

### Arquetipos

Hasta el **nivel 8** solo salen **cartas generales**. En el nivel 8 eliges **arquetipo** (3 de los 11 al azar; Granada los cambia) y acto seguido una carta de bienvenida de tu arquetipo. Desde ahí, cada carta de la oferta sale de tu arquetipo con un **35 %** (+1 % por cada Trébol que cojas) y del pozo general con el resto. Una build: **10 cartas** (generales + de arquetipo) **+ 1 mítica**.

Cada arquetipo tiene **6 cartas** (el Mecánico, 7): las normales y una **firma** (en negrita), siempre épica, que solo aparece cuando tienes sus dos cartas. Si pierdes una de ellas al caer, la firma se apaga hasta que la recuperes.

| Arquetipo | Idea | Cartas (6) |
|---|---|---|
| **Pirómano** | Fuego que se contagia y explosivos | Pólvora · Fósforo · Napalm · Rescoldos · Mecha corta · **Pirotécnico** |
| **Electricista** | Rayos que saltan de zombie en zombie | Reacción en cadena · Pararrayos · Sobrecarga · Condensador · Tormenta · **Tesla** |
| **Berserker** | Cuanto más herido, más peligroso | Adrenalina · Vampiro · Furia · Sangre caliente · Último aliento · **Imparable** |
| **Francotirador** | Tiros a la cabeza lentos y letales | Ojo de halcón · Puntería · Cazatanques · Pulso firme · Una bala basta · **Cazador de élites** |
| **Tanque** | Aguanta golpes y los devuelve. **Pasiva**: con Juggernog el doble de vida y el escudo de zombies en la espalda (se puede romper; cada ronda uno nuevo o reparado) | Espinas · Nudillos de hierro · Piel de piedra · Coraza · Masa · **Coloso** |
| **Banquero** | Los puntos son poder | Codicia · Cabezas de oro · Interés compuesto · Mercenario · Caja económica · **Plutócrata** |
| **Gatillo** | Disparar sin parar y sin recargar | Gatillo loco · Últimas balas · Tambor caliente · Plomo · Cinta de balas · **Fuego continuo** |
| **Velocista** | Correr, esquivar y no parar | Sed de sangre · Escurridizo · Resbaladizo · Zancada · Estela · **Ciclón** |
| **Domador** | Leapers que luchan por ti | Silbato · Correa larga · Collar de púas · Carne fresca · Manada · **Alfa** |
| **Suertudo** | Rerolls, dados y cartas mejores | Buscador de botín · Pata de conejo · Dados · Amuleto · Herradura · **Jackpot** |
| **Mecánico** | Torretas que disparan por ti | Caja de herramientas · Engranajes · Recarga rápida · Calibre .50 · Rebote · Cadena de montaje · **Mortero** |

- **16 cartas que ya existían pasan a su arquetipo** (en la tabla, las primeras de cada fila). Trébol sigue siendo general.
- **5 cartas de relleno** nuevas en el pozo general, que valen poco a propósito: Cordones nuevos, Cantimplora, Calderilla, Pulsera de la suerte y Medalla. Elegir bien y rerollear importa.
- En la lista (H) arriba pone tu arquetipo y sus cartas van en su color.

<details>
<summary><b>Todas las cartas de arquetipo</b></summary>

| Arquetipo | Carta | Efecto | Valores | Tope |
|---|---|---|---|---|
| Pirómano | Fósforo | % de que cada bala incendie al zombie: pierde un 4 % de su vida máxima por segundo durante 6 s (cada impacto reinicia el tiempo). Al apagarse queda "quemado" | 6 / 9 / 13 / 18 / 26 % | 80 % |
| Pirómano | Napalm | Cada segundo, un zombie ardiendo tiene este % de contagiar a cada zombie pegado a él. Un zombie que ya se apagó no se contagia (solo un impacto directo lo vuelve a prender) | 15 / 22 / 30 / 42 / 60 % | 100 % |
| Pirómano | Rescoldos | +vida al matar a un zombie que está ardiendo | 4 / 6 / 9 / 13 / 18 | 60 |
| Pirómano | Mecha corta | Las granadas estallan en cuanto dejan de moverse y hacen +% de daño | 20 / 30 / 45 / 65 / 90 % | 300 % |
| Pirómano | **Pirotécnico** (firma) | Requiere Fósforo + Pólvora. Todas tus explosiones incendian a los zombies que alcanzan | — | — |
| Electricista | Pararrayos | % de que cada baja lance un rayo (15 % de la vida) a otro zombie cercano | 8 / 12 / 17 / 24 / 34 % | 80 % |
| Electricista | Sobrecarga | Al recargar, un rayo al zombie más cercano con este % de su vida (más de 100 % mata) | 25 / 35 / 50 / 70 / 100 % | 200 % |
| Electricista | Condensador | 10 bajas seguidas sin recibir daño lo cargan: el siguiente tiro lanza 3 rayos de este % de vida | 50 / 70 / 100 / 140 / 200 % | 300 % |
| Electricista | Tormenta | Descarga a tu alrededor: este % de vida a cada zombie cercano y 1 s a cámara lenta. Cada 4.5 s, menos 0.03 s por punto de la carta (mínimo 1.5 s: con 42 % cada 3.2 s, con 90 % cada 1.8 s) | 12 / 16 / 22 / 30 / 42 % | 90 % |
| Electricista | **Tesla** (firma) | Requiere Pararrayos + Condensador. Todos tus rayos (también los de Zeus) alcanzan a 2 zombies más | — | — |
| Berserker | Furia | Cada golpe recibido da +% de daño durante 5 s, acumulable 3 veces | 5 / 8 / 11 / 15 / 22 % | 60 % |
| Berserker | Sangre caliente | +vida por segundo mientras tienes menos de media vida | 2 / 3 / 4 / 6 / 9 | 40 |
| Berserker | Último aliento | Una vez por ronda, al bajar del 25 % de vida (o al recibir un golpe mortal) eres invulnerable estos segundos y haces el doble de daño | 3 / 4 / 5 / 6 / 8 s | 12 s |
| Berserker | **Imparable** (firma) | Requiere Adrenalina + Furia. Con menos del 25 % de vida: +20 % de velocidad y los golpes de zombie hacen la mitad | — | — |
| Francotirador | Pulso firme | +% de daño si llevas 2 s sin disparar | 15 / 22 / 32 / 45 / 65 % | 200 % |
| Francotirador | Una bala basta | Un tiro a la cabeza desde lejos (15 m) mata si al zombie le queda menos de este % de vida (no al jefe) | 25 / 35 / 45 / 60 / 80 % | 100 % |
| Francotirador | **Cazador de élites** (firma) | Requiere Ojo de halcón + Pulso firme. Cabeza a un tanque o al jefe: daño ×3 (el jefe sigue con su tope del 15 %) | — | — |
| Tanque | Piel de piedra | −% de daño recibido estando quieto | 10 / 15 / 20 / 28 / 40 % | 60 % |
| Tanque | Coraza | Cada golpe de zombie hace esta cantidad menos (mínimo 1) | 5 / 8 / 12 / 18 / 25 | 60 |
| Tanque | Masa | +vida máxima por cada carta de Tanque que tengas (Masa incluida) | 5 / 8 / 12 / 16 / 24 | 60 |
| Tanque | **Coloso** (firma) | Requiere Espinas + Piel de piedra. Quieto, el zombie que te golpea pierde toda su vida y tu cuchillo hace ×3 | — | — |
| Banquero | Interés compuesto | +1 % de daño por cada 1000 puntos que tengas sin gastar, hasta este tope | 10 / 15 / 20 / 25 / 35 % | 50 % |
| Banquero | Mercenario | Cada 50 bajas tuyas, +puntos para todo el equipo | 200 / 300 / 400 / 600 / 800 | 2000 |
| Banquero | Caja económica | La caja te cuesta −% | 10 / 15 / 20 / 30 / 40 % | 60 % |
| Banquero | **Plutócrata** (firma) | Requiere Codicia + Interés compuesto. +6 % de daño por cada perk que llevas y +50 puntos por baja | — | — |
| Gatillo | Tambor caliente | +% de daño tras 1 s disparando seguido (se pierde al parar) | 8 / 12 / 18 / 25 / 36 % | 150 % |
| Gatillo | Plomo | +1 % de daño por cada bala seguida sin recargar ni cambiar de arma, hasta este tope | 10 / 15 / 20 / 30 / 40 % | 100 % |
| Gatillo | Cinta de balas | +balas al cargador por cada baja | 2 / 3 / 4 / 6 / 8 | 20 |
| Gatillo | **Fuego continuo** (firma) | Requiere Tambor caliente + Plomo. Con combo 10 (bajas seguidas) el cargador se rellena solo | — | — |
| Velocista | Resbaladizo | +% de velocidad con 3 o más zombies encima (menos de 4 m) | 5 / 8 / 12 / 16 / 24 % | 40 % |
| Velocista | Zancada | Stamin-Up gratis (se puede comprar igual) y +% de velocidad esprintando | 4 / 6 / 9 / 12 / 18 % | 30 % |
| Velocista | Estela | Esprintando dejas un rastro de 2 s: los zombies que lo pisan van un % más lentos | 30 / 40 / 50 / 60 / 75 % | 75 % |
| Velocista | **Ciclón** (firma) | Requiere Sed de sangre + Estela. Esprintando, cada zombie que tocas pierde un 25 % de su vida (cada medio segundo) | — | — |
| Domador | Silbato | Un leaper te sigue y muerde a los zombies que se acercan (1000 de daño o un tercio de su vida). Carta base: sin ella las demás no hacen nada. Siempre RARA, una sola vez | — | 1 |
| Domador | Correa larga | Tus leapers se mueven +% más rápido | 10 / 15 / 20 / 30 / 40 % | 100 % |
| Domador | Collar de púas | Los mordiscos de tus leapers hacen +% | 15 / 25 / 35 / 50 / 70 % | 200 % |
| Domador | Carne fresca | +vida cada vez que un leaper tuyo mata | 3 / 5 / 7 / 10 / 15 | 50 |
| Domador | Manada | +1 leaper, hasta 3 en total | — | 2 |
| Domador | **Alfa** (firma) | Requiere Collar de púas + Manada. Durante 3 s tras cada baja tuya, tus leapers hacen ×2 y sus mordiscos incendian | — | — |
| Suertudo | Pata de conejo | +rerolls al cogerla y +1 reroll cada 3 niveles | 1 / 2 / 2 / 3 / 4 | 20 |
| Suertudo | Dados | % de que la carta que cojas valga el doble | 15 / 22 / 30 / 42 / 60 % | 80 % |
| Suertudo | Amuleto | % de que cada subida de nivel te ofrezca 4 cartas en vez de 3 | 20 / 30 / 45 / 60 / 80 % | 100 % |
| Suertudo | Herradura | % de que al empezar cada ronda aparezca un power-up a tus pies | 20 / 30 / 45 / 60 / 80 % | 100 % |
| Suertudo | **Jackpot** (firma) | Requiere Dados + Pata de conejo. Una vez por ronda, la primera carta que te ofrecen es LEGENDARIA, y la mitad de los rerolls no se gastan | — | — |
| Mecánico | Caja de herramientas | Puedes construir 1 torreta (kit en la tecla de acción 1). Carta base: sin ella las demás no hacen nada. Siempre RARA, una sola vez | — | 1 |
| Mecánico | Engranajes | Tus torretas disparan +% más rápido | 10 / 15 / 22 / 30 / 42 % | 100 % |
| Mecánico | Recarga rápida | Tus torretas recargan en −% de tiempo | 10 / 15 / 22 / 30 / 40 % | 70 % |
| Mecánico | Calibre .50 | +% de daño por bala de tus torretas | 15 / 25 / 35 / 50 / 70 % | 200 % |
| Mecánico | Rebote | % de que la bala salte al zombie más cercano (4 m) con el 60 % del daño | 10 / 15 / 22 / 30 / 40 % | 80 % |
| Mecánico | Cadena de montaje | +1 torreta, hasta 3 en total | — | 2 |
| Mecánico | **Mortero** (firma) | Requiere Calibre .50 + Cadena de montaje. Cada 8 s cada torreta lanza un mortero al zombie con más zombies alrededor (250 % del daño de una bala en 1.6 m) | — | — |

</details>

### Jefes y bebidas

Ver [Jefes: Brutus, la Bruja y Leroy](#jefes-brutus-la-bruja-y-leroy). Resumen: cada 10 minutos sale uno de los tres (el primero al azar y luego repite el 66 %). **Solo Brutus** suelta pieza del Bastón. La **Bruja** aparece a dos metros detrás de ti y se teletransporta cada 20 s; si os toca dos veces se sacia (2 power-ups); si la matáis antes, Munición máxima y **una bebida nueva para cada uno** (o una carta si no te cabe). **Leroy** te roba una carta por golpe (hasta 3 por jugador; en cooperativo, cuando ya te ha robado 3 se va a por otro) y al morir las deja en cuencos de caramelos: 15 s para recogerlas, y vuelven **mejoradas**.

### Balance

| | Antes | Ahora |
|---|---|---|
| **Vida de zombies** | 150 al empezar, +115 por ronda, ×1.11 desde la 10 (ronda 20: 3105) | **188** al empezar, **+130** por ronda, **×1.13** desde la 10 (ronda 10: 1387; ronda 20: **4699**; ronda 30: 15 943) |
| **Pistolas** | 10 huecos de carta | **20 huecos** (15 el resto) |
| **Tanque** | — | Vida ×2 con Juggernog y escudo de zombies cada ronda |
| **Pararrayos** | — | Rayo del 15 % de la vida |
| **Tormenta** | — | 12 a 42 % de vida por descarga, y cada 4.5 s menos 0.03 s por punto (mínimo 1.5 s) |
| **Mítica Leaper** | Mítica repetible hasta 3 | Fuera: ahora es Silbato + Manada del Domador. Nueva mítica **Hora bruja** |
| **Símbolo %** | Salía como `..` | Se escribe `pct` (`set jodas_pct "por ciento"` para cambiarlo) |

### Cómo se ve

- Cada carta lleva un **marco del color de su rareza** (gris, verde, azul, morado, dorado; rojo las míticas) con el nombre de la rareza en la banda de arriba, y el fondo lleva el **color de tu arquetipo** (o de la clase en el menú de clase).
- La carta marcada **crece y se ilumina**; las cartas aparecen en fundido escalonado y el título se descifra letra a letra.
- La barra de vida del jefe lleva su nombre.

</details>

</details>

### Cartas generales nuevas

| Carta | Efecto | Valores | Tope |
|---|---|---|---|
| **Armadura** | Absorbe por completo este número de golpes de zombie cada ronda (se recarga al empezar la ronda y al coger la carta) | 1 / 1 / 2 / 2 / 3 golpes | 6 |
| **Sangre fría** | +% de daño cuando no hay ningún zombie a menos de 4 metros de ti | 6 / 10 / 14 / 20 / 30 % | 100 % |
| **Médico** | Al reanimar a alguien, los dos recuperáis esta vida y los zombies os ignoran 2 s | 20 / 30 / 45 / 65 / 100 | 250 |
| **Madrugador** | +% de daño durante los primeros 30 s de cada ronda | 8 / 12 / 18 / 25 / 36 % | 100 % |

Con ellas el pozo general tiene 22 cartas normales (15 de ellas de estadísticas que ocupan hueco), 5 de relleno, 4 de equipo, 5 de power-up y Pack-a-Punch. También: 16 cartas (no 17) fueron las que pasaron a su arquetipo en la 1.8.0.

<details>
<summary><b>Novedades de la 1.7.0</b></summary>

### Nuevo

| | |
|---|---|
| **10 huecos de carta** | Cada jugador puede tener 10 cartas distintas, más la mítica. Con los 10 llenos solo te salen las que ya tienes (para subirlas) y las de efecto inmediato. |
| **Rerolls** | 3 por partida. En el menú de cartas, **Granada** cambia las 3 cartas. |
| **Bloquear** | En el menú de cartas, **Táctica** bloquea la carta marcada para que no te vuelva a salir. Gasta esa subida de nivel. |
| **Penalización al caer** | Si te tumban, antes de que puedan reanimarte eliges una carta que pierdes (entre 3 al azar de las tuyas). Pierdes ese tipo entero. |
| **Lista de cartas con tecla** | Ya no está siempre en pantalla: la H (o tu tecla) la muestra y la oculta. Arriba pone tus huecos y rerolls. |

### Balance

**Clases**

| Clase | Antes | Ahora |
|---|---|---|
| **Escopetas** | 15 % de matar de un tiro por bala · −15 % de velocidad | 15 % por perdigón con escopeta y **35 % por bala con francotirador** · **−10 %** de velocidad |
| **Automáticas** | +1 % de daño por tiro seguido, **sin tope** · 10 % de gastar 2 balas | **+0.5 %** por tiro seguido, **tope +20 %** · **15 %** de gastar 2 balas |
| **Pistolas** | ×1.3 velocidad · −50 % daño explosivo | Lo mismo **+40 % de daño** con balas |
| **Rifles** | Sin cambios | |

**Cartas**

| Carta | Antes | Ahora |
|---|---|---|
| **Mochila** | 1 / 2 / 3 / 4 / 6 balas por baja | **3 / 5 / 8 / 12 / 20 balas por minuto** (tope 40 = una cada 1.5 s) |
| **Manos rápidas** | 2 / 4 / 6 / 10 / 14 % · tope 60 % | **0.05 / 0.3 / 1 / 2.5 / 4.5 %** · tope 4.5 % |

**Jefe**

| | Antes | Ahora |
|---|---|---|
| Vida | 20 zombies de la ronda | **70** zombies de la ronda (×3.5) |
| Movimiento | Andaba → corría a media vida → esprintaba a un cuarto | **Corre desde que sale** → esprinta a media vida → **super sprint** a un cuarto |
| Furia | Esprintaba 10 s | **Super sprint** 10 s |
| Daño por golpe | Sin límite | **Máximo 15 %** de su vida por golpe (Sliquifier y Paralizador con Instakill lo mataban de una) |

### Arreglos

- **Bastón de fuego + Gatillo infinito**: el bastón no gastaba balas nunca. Ahora ninguna carta le da ni le devuelve balas.
- **Postura con el bastón**: el jugador se veía con las manos a la espalda. Ya sujeta el bastón normal.
- **Fogonazo del bastón**: el efecto al disparar no aparecía.
- **Partida rota a las ~488 cartas**: el juego no libera los textos que se escriben en pantalla y se llenaba. Ahora el mod apenas crea textos nuevos.
- **La caja te cambiaba la mítica** sin preguntar. Ahora te da una carta normal en su lugar. Si no hay ninguna carta que puedas recibir, te devuelve los puntos.
- **Pieza del bastón inalcanzable** (en la lava o fuera del mapa): a los 60 s aparece sobre la mesa.
- No se pueden lanzar granadas con un menú de cartas abierto.

</details>

<details>
<summary><b>Versiones anteriores</b></summary>

#### 1.6.1
- Los menús de clase y de cartas ya no tienen tiempo límite.

#### 1.6.0
- **La caja da cartas en vez de armas**, con precio por jugador (2500 y ×1.17 por tirada).
- **Super sprinters**: hasta 6 zombies más rápidos que tú.
- **Nivel en el marcador**: la columna Headshots del Tab muestra tu nivel.

#### 1.5.0
- **Bastón de fuego** construible con las piezas que suelta Brutus.
- Brutus un 25 % más rápido. Experiencia más fuerte.

#### 1.4.0
- **Jefe Brutus** cada 10 minutos. Mítica Leaper amaestrado (sustituida en la 1.8 por Hora bruja).
- Bomberman recibe ×2 también de explosiones.

#### 1.3.0
- Una mítica por jugador, con dueño. Nerfeo ~20 % de las cartas normales.
- Pack-a-Punch solo con cartas y nueva carta épica Pack-a-Punch.
- Gatillo loco y Manos rápidas dejan comprar Double Tap y Speed Cola.

#### 1.2.0
- Ventaja y desventaja por clase. Cartas de equipo y de power-up. Trébol y 8 cartas nuevas.

#### 1.1.0
- Menús con mando. Lista de cartas.

#### 1.0.0
- Clases, arma de ronda, tanques, caos y cartas con 5 rarezas.

</details>

---

## Clases

Al empezar eliges clase (los zombies no salen hasta que todos eligen). Al **empezar cada ronda**, el arma que llevas **en la mano** se cambia por otra al azar de tu clase; la del otro hueco no se toca. Cada ronda hay un **8 %** de que salga el arma especial (sube con la carta Afortunado).

| Clase | Armas | Especial | Ventaja | Desventaja |
|---|---|---|---|---|
| **Escopetas** | Remington 870, Olympia, S12, M1216, KSG, DSR 50, Barrett M82A1, SVU-AS, Ballista | Blundergat | 15 % de que un perdigón mate de golpe; 35 % por bala con francotirador. **Speed Cola de clase** (recargas en la mitad de tiempo) | −5 % de velocidad |
| **Automáticas** | Galil, AK74u (y cargador ampliado), MP5K, PDW-57, MTAR, AN-94, SCAR-H, M27, AK-47, STG-44, Thompson, MP40 (y Stalker), Uzi, Skorpion EVO, HAMR, RPD, LSAT, MG08/15 | Sliquifier | +0.5 % de daño por tiro seguido acertado, hasta +15 % (se pierde al fallar) | 25 % de que un tiro gaste 2 balas |
| **Rifles** | M14, FAL, SMR (×4 de daño por bala), M16, Type 25, M8A1, Chicom CQB | Paralizador | **Ejecutor**: la bala que deja a un zombie por debajo del 20 % de su vida lo remata (al jefe no) | Ninguna |
| **Pistolas** | M1911 (siempre Mustang & Sally), Five-seven (y dual), B23R (y cargador ampliado), KAP-45, Python, Executioner, Remington New Model Army, Mauser C96 (siempre Boomhilda) | Ray Gun (la Mark II, 1 % por ronda) | +40 % de daño, ×1.3 de velocidad, −50 % de daño explosivo recibido, 15 huecos de carta y **empiezan con un Trébol ÉPICO** | Ninguna |

- **Bonus de puntos por baja**: el juego da 10 puntos por cada impacto, y Automáticas necesita muchos más impactos por zombie que el resto. Para igualarlo, Escopetas cobra un extra del **7.5 %** de la vida del zombie por cada baja, Pistolas el **5.1 %** y Rifles el **0.13 %** (sus balas ya necesitan casi tantos impactos como Automáticas). El extra se divide entre tus cartas de Calibre y Gatillo loco, porque con ellas Automáticas también necesita menos impactos. Al jefe no. Así las cuatro clases sacan casi los mismos puntos por zombie en cualquier ronda.
- Las paredes funcionan normal. **La caja da cartas, no armas**. **El Pack-a-Punch no se puede usar pagando**: las armas solo se mejoran con cartas.
- El Bastón de fuego nunca se cambia por el arma de ronda.

---

## Cartas

Subes de nivel matando: el primer nivel a las **9 bajas** (los zombies de la ronda 1) y cada nivel cuesta 5 más (9, 23, 42, 66, 95...). Al subir eliges **1 de 3 cartas**. Hasta el nivel 8 solo salen cartas generales; en el nivel 8 eliges arquetipo (ver arriba). Desde que subes de nivel hasta que eliges, los zombies te ignoran; con el menú abierto eres invulnerable, sin límite de tiempo.

| Común | Poco común | Rara | Épica | Legendaria |
|---|---|---|---|---|
| 50 % | 28 % | 14 % | 6 % | 2 % |

- Cada carta del menú tira su rareza por separado. Las cartas se **acumulan** hasta su tope.
- Cada vez que coges una carta, su probabilidad de volver a salir sube un 8 %. **Trébol** sube la rareza de las que te salen.
- **15 huecos** (20 con Pistolas): cartas distintas que puedes tener (Calibre ×3 ocupa uno). Las de equipo, los power-ups, Pack-a-Punch y Medalla no ocupan hueco. Con los huecos llenos solo salen las que ya tienes y las que no ocupan hueco.
- **3 rerolls** por partida (**Granada** en el menú), **1 bloqueo** por partida (**Táctica**: la carta no vuelve a salirte, pero gastas esa subida) y **no coger nada** (**Cuchillo**: gastas la subida). Mientras eliges, tu lista de cartas se ve abajo.

### Cartas generales

Valores por rareza: común / poco común / rara / épica / legendaria. Las marcadas con (A) ahora son de un arquetipo: solo le salen a quien lo tiene.

| Carta | Efecto | Valores | Tope |
|---|---|---|---|
| Piernas ligeras | +% velocidad | 3 / 5 / 7 / 10 / 16 % | 80 % |
| Muelles | Saltas más alto y sin daño por caída | 50 / 70 / 105 / 145 / 210 | 700 |
| Calibre | +% daño con todo | 5 / 7 / 10 / 14 / 22 % | 300 % |
| Gatillo loco (A: Gatillo) | Double Tap gratis + % daño (×2 si además compras Double Tap) | 2 / 4 / 6 / 10 / 14 % | 150 % |
| Cargador mágico | % de no gastar bala | 4 / 6 / 10 / 14 / 20 % | 60 % |
| Manos rápidas | Speed Cola gratis + % de rellenar el cargador al matar (×2 con Speed Cola) | 0.05 / 0.3 / 1 / 2.5 / 4.5 % | 4.5 % |
| Mochila | Balas de reserva por minuto para el arma de la mano | 5 / 8 / 12 / 18 / 30 | 60 |
| Corazón de hierro | +vida máxima | 8 / 12 / 20 / 32 / 48 | 400 |
| Regeneración | +vida por segundo | 1 / 1 / 2 / 3 / 5 | 25 |
| Vampiro (A: Berserker) | +vida por baja | 2 / 3 / 4 / 6 / 10 | 60 |
| Blindaje | −% daño de zombies | 3 / 5 / 7 / 10 / 14 % | 60 % |
| Pólvora (A: Pirómano) | +% daño explosivo | 8 / 12 / 20 / 32 / 48 % | 400 % |
| Ojo de halcón (A: Francotirador) | +% daño a la cabeza | 8 / 12 / 20 / 32 / 48 % | 400 % |
| Golpe crítico | % de golpe ×2.5 | 2 / 4 / 6 / 10 / 14 % | 60 % |
| Nudillos de hierro (A: Tanque) | +% daño cuerpo a cuerpo | 40 / 65 / 95 / 145 / 240 % | 3000 % |
| Codicia (A: Banquero) | +puntos por baja | 4 / 8 / 12 / 20 / 32 | 300 |
| Reacción en cadena (A: Electricista) | % de que el zombie explote al morir | 3 / 5 / 7 / 10 / 16 % | 60 % |
| Imán | Atrae power-ups en este radio | 250 / 360 / 520 / 720 / 1040 | 5000 |
| Buscador de botín (A: Suertudo) | % de power-up por baja | 0.4 / 0.8 / 1.2 / 2.0 / 3.2 % | 5 % |
| Segundo aliento | % de evitar un golpe mortal (quedas a media vida) | 8 / 12 / 18 / 24 / 36 % | 90 % |
| Escurridizo (A: Velocista) | Segundos que te ignoran tras un golpe | 0.4 / 0.6 / 1.0 / 1.3 / 1.8 s | 6 s |
| Suerte del Pack | % de que el arma de ronda venga mejorada | 4 / 6 / 10 / 14 / 20 % | 100 % |
| Granadero | % de recuperar granada al matar | 2 / 4 / 6 / 10 / 14 % | 60 % |
| Espinas (A: Tanque) | El zombie que te pega pierde este % de su vida | 12 / 20 / 32 / 48 / 72 % | 500 % |
| Afortunado | +% de arma especial de tu clase | 2 / 4 / 6 / 10 / 14 % | 70 % |
| Trébol | Suerte: sube la rareza de las cartas | 2 / 4 / 6 / 10 / 14 % | 60 % |
| Sed de sangre (A: Velocista) | +% velocidad 3 s tras cada baja | 4 / 6 / 10 / 13 / 18 % | 60 % |
| Adrenalina (A: Berserker) | +% daño con menos de media vida | 6 / 10 / 14 / 20 / 32 % | 200 % |
| Puntería (A: Francotirador) | +% daño apuntando con la mira | 4 / 6 / 10 / 14 / 20 % | 100 % |
| Últimas balas (A: Gatillo) | +% daño con el cargador por debajo del 30 % | 8 / 12 / 18 / 24 / 36 % | 200 % |
| Cazatanques (A: Francotirador) | +% daño a tanques | 12 / 20 / 32 / 48 / 72 % | 400 % |
| Experiencia | Cada baja cuenta +% para subir de nivel | 10 / 15 / 22 / 30 / 45 % | 150 % |
| Combo | +% daño por cada baja seguida (2 s entre bajas, máx. 10) | 1 / 2 / 2 / 3 / 5 % | 20 % |
| Cabezas de oro (A: Banquero) | +puntos por baja a la cabeza | 8 / 12 / 20 / 32 / 48 | 400 |
| Armadura | Absorbe del todo este número de golpes de zombie por ronda | 1 / 1 / 2 / 2 / 3 | 6 |
| Sangre fría | +% daño sin ningún zombie a menos de 4 m | 6 / 10 / 14 / 20 / 30 % | 100 % |
| Médico | Al reanimar, vida para los dos y 2 s de que os ignoren | 20 / 30 / 45 / 65 / 100 | 250 |
| Madrugador | +% daño los primeros 30 s de cada ronda | 8 / 12 / 18 / 25 / 36 % | 100 % |
| Cordones nuevos | +% velocidad (relleno) | 1 / 1 / 2 / 2 / 3 % | 10 % |
| Cantimplora | +vida máxima (relleno) | 2 / 3 / 4 / 6 / 8 | 30 |
| Calderilla | +puntos por baja (relleno) | 5 / 8 / 10 / 15 / 20 | 100 |
| Pulsera de la suerte | Como Trébol, pero casi nada (relleno) | 1 / 1 / 2 / 2 / 3 % | 10 % |
| Medalla | Subes esos niveles ahora mismo, con sus cartas. No ocupa hueco | 1 / 1 / 1 / 2 / 3 niveles | — |

### Cartas especiales

| Carta | Rareza | Efecto |
|---|---|---|
| Monos, Claymores, Semtex, Granadas EMP | Rara | Te da el equipo lleno y cada ronda recuperas 1 por nivel de la carta (máx. 3). No ocupan hueco. Si pierdes la carta, pierdes el equipo. |
| Munición máxima, Instakill, Doble puntos, Carpintero, Nuke | Común | Power-up inmediato para todo el equipo. No ocupan hueco. |
| Pack-a-Punch | Épica | Mejora el arma de la mano (si ya lo está, la otra; si las dos, munición máxima). Única forma de mejorar un arma de caja o de pared. No ocupa hueco. |

### Míticas

**5 %** de que una de las 3 cartas sea mítica. Llevas **una sola** y no ocupa hueco: si coges otra, sustituye a la tuya. La primera persona que coge una mítica es su dueña y a los demás ya no les sale.

| Mítica | Efecto |
|---|---|
| **Bomberman** | Arma de ronda siempre un explosivo mejorado (RPG, War Machine, Mustang & Sally, Ray Gun). 45 % de no gastar munición, explosivos ×1.5. **Contra**: recibes ×2 de zombies y de explosiones (sin Jugg, un pepinazo cerca te tumba). |
| **Fénix** | Una vez por ronda, un golpe mortal no te tumba: renaces con la vida llena y explotas. |
| **Cuerpo de cristal** | Tu daño ×3. **Contra**: recibes ×1.75. |
| **Ira de Zeus** | Cada baja tiene un 30 % de lanzar un rayo que mata a 3 zombies cercanos. |
| **Rey Midas** | +100 puntos por baja y un power-up cada 20 bajas. |
| **Gatillo infinito** | Nunca gastas balas (salvo con el Bastón de fuego). **Contra**: el arma de la mano cambia también cada 45 s. |
| **Hora bruja** | Cada 3 minutos, 10 segundos en que todos los zombies van a cámara lenta para todo el equipo (el jefe no). |

### Caja misteriosa

Gira como siempre, pero da **una carta** al azar (misma tabla de rarezas y 5 % de mítica), aplicada directamente. Respeta tus huecos y bloqueos, y nunca te cambia la mítica que tienes.

| Tirada | 1.ª | 2.ª | 3.ª | 4.ª | 5.ª | 6.ª |
|---|---|---|---|---|---|---|
| Precio | 2500 | 2925 | 3422 | 4004 | 4684 | 5480 |

El precio es **de cada jugador** (×1.17 por cada tirada tuya, hasta un máximo de **999.999**). Si no te llega, se cierra sin cobrar. No se mueve.

### Penalización al caer

Si te tumban, antes de que puedan reanimarte eliges **una carta que pierdes** entre 3 al azar de las tuyas (normales y de equipo). Pierdes ese tipo **entero**: si tenías Calibre ×3, pierdes las tres y se libera el hueco. Mientras eliges nadie puede reanimarte y no te desangras; en solitario, el Quick Revive espera a que elijas. Las míticas no se pierden.

---

## Jefes: Brutus, la Bruja y Leroy

Cada **10 minutos** (el primero en el minuto 10) el siguiente zombie que sale es un jefe: aparece **en el charco de lava del centro de Pueblo**, se queda medio segundo y arranca. Solo uno a la vez, con barra de vida arriba. Hay **tres**: el primero que sale es al azar y, a partir de ahí, ese mismo repite el **66 %** de las veces y los otros dos se reparten el resto.

| Jefe | Vida (× zombie de la ronda) | Cómo es | Al morir |
|---|---|---|---|
| **Brutus** | 70 | El de siempre: rugido, pisotón, fases, furia y 4 tanques de escolta | 2 power-ups, carta gratis para todos y **pieza del Bastón de fuego** (solo él) |
| **Bruja** | 40 | Aparece **a dos metros detrás de un jugador** al azar y cada 20 s se desvanece y reaparece detrás de otro. No se la puede frenar. Cada vez que **toca** a alguien (se le pega) ese jugador pierde el 10 % de sus puntos; al **segundo toque** (a cualquiera) queda *saciada* | Saciada: 2 power-ups. **Con menos de dos toques**: Munición máxima para todos y a cada jugador **una bebida al azar** de las que no se pueden comprar (sin contar para el límite de 4 de las máquinas); quien ya tenga las cinco elige una **carta entre 3** |
| **Leroy** | 50 | Viene borracho: super sprint con arreones (acelera y frena cada segundo). Cada golpe te **roba una carta entera** (un tipo con todos sus stacks, como la penalización al caer), como mucho una cada 3 s y **3 por jugador**. En cooperativo, cuando ya te ha robado 3 va directo a por otro; si no puede robar a nadie (o en solo), solo pega | Deja en el suelo un **cuenco de caramelos** por cada carta robada: su dueño tiene **15 s** para recogerlo y la carta vuelve **mejorada** (×1.4 de valor). Si no robó nada, 2 power-ups |

**Bebidas que regala la Bruja** (solo las que no están en las máquinas de Pueblo): **Mule Kick**, **Deadshot Daiquiri**, **PhD Flopper** (explosión al tirarse en plancha y resistencia a explosivos), **Electric Cherry** (descarga al recargar, más fuerte cuanto más vacío el cargador) y **Tombstone**. Con icono en la barra como las demás. Se pierden al caer, como todas. Who's Who no entra (necesita el clon y los filtros de Die Rise). En mapas con máquina de alguna de ellas, la da el propio juego.

### Brutus en detalle

| | |
|---|---|
| Vida | 70 veces la de un zombie de la ronda |
| Golpe | 150 (sin Juggernog te tumba de un toque) |
| Velocidad | Corre desde que sale, un 25 % más rápido que un zombie normal |
| Daño máximo | Ningún golpe le quita más del 15 % de su vida |
| Inmune a | Instakill (le quita 5 % por impacto), Nuke, Ira de Zeus y Fénix (15 %), el tiro de suerte de Escopetas (hace ×3) |
| Escolta | Los 4 zombies siguientes salen como tanques |

**Habilidades**
1. **Rugido** (cada 15 s): los zombies cercanos esprintan 8 s.
2. **Pisotón**: al golpear a alguien, los jugadores cerca salen despedidos y pierden 20 de vida.
3. **Fases**: a media vida esprinta; a un cuarto pasa a super sprint y arde.
4. **Furia**: si pasa 20 s sin recibir daño, super sprint durante 10 s.

**Al morir**: dos power-ups, una **carta gratis** para cada jugador en pie y una **pieza del Bastón de fuego**.

### Consola para los jefes

| Comando | Qué hace |
|---|---|
| `set jodas_jefe_minutos 1` | Jefe cada minuto. |
| `set jodas_jefe_forzar bruja` | Siempre sale ese jefe (`brutus`, `bruja`, `leroy`). |
| `set jodas_jefe_repite 66` | % de que repita el primer jefe que salió. |
| `set jodas_bruja_tp 5` | La Bruja se teletransporta cada 5 s (20 por defecto). |
| `set jodas_bruja_toques 1` | Toques para que la Bruja se sacie (2 por defecto). |
| `set jodas_bruja_vida 0.01` | Bruja con un golpe de vida, para probar sus recompensas. |
| `set jodas_jefe_pos "1472 -399 -61"` | Punto fijo donde aparecen los jefes (por defecto, el charco de lava grande). |

---

## La forja de Pueblo: mejorar el Bastón

Al construir el primer Bastón de fuego empieza un ritual de tres pasos. El progreso es de todo el equipo y se ve en la mesa (al acercarte) y en la lista (H).

| Paso | Qué hay que hacer | Si falla |
|---|---|---|
| **1. Encender la calle** | Tres charcos de lava se encienden uno a uno en un orden. Dispara con el bastón a los charcos en ese orden. Al acertar, esos charcos arden el resto de la partida | Se apagan, se repite el orden con un charco más |
| **2. Almas** | Mata **40 zombies con el bastón** (fuego incluido) a menos de **10 m de la mesa**. Cada baja manda un alma de fuego a la mesa. Rematar a un jefe con el bastón vale 20 | — |
| **3. La forja** | Con las 40 almas, **USAR en la mesa con el bastón en la mano**: lo dejas allí y esa ronda los zombies van a por la mesa. Defiéndela hasta que acabe la ronda | Si un zombie se queda pegado a la mesa 5 s seguidos, la forja se enfría: pierdes el 25 % de las almas y recuperas el bastón sin mejorar |

**La recompensa: el Bastón de fuego mejorado** (el de Origins, Kagutsuchi). Dispara igual que el básico pero más fuerte (3300 de impacto y 150 por segundo ardiendo), y **manteniendo el disparo se carga**: suelta una bola grande que al caer deja un **charco de fuego** 5 s (media carga, radio 80 y 11 500 de impacto; carga completa, radio 100 y 20 000) y dispara 1 o 2 bolas extra. Un impacto que mataría de golpe remata al momento la mitad de las veces. 120 balas.

- Si quien dejó el bastón está caído o se ha ido cuando termina la forja, el bastón queda en la mesa: USAR para cogerlo.
- Un segundo bastón (otro Brutus) repite el ritual desde las almas; los charcos ya arden.
- El bastón mejorado no suma almas y el jefe sigue con su tope del 15 % por golpe.
- Consola: `jodas_forja_almas 40`, `jodas_forja_secuencia 3`, `jodas_forja_contacto 5`, `jodas_forja_radio 600`, `jodas_forja 0` lo desactiva.

---

## Bastón de fuego

- Cada jefe suelta una pieza (punta, caña o base) donde muere. Se recoge pasando por encima; las piezas son del equipo. Si nadie la coge en 60 s, aparece sobre la mesa.
- Con **3 piezas**, ve a la **mesa de taller junto al Juggernog** y pulsa USAR (F / X).
- Cada disparo lanza 3 bolas de fuego en abanico. El zombie alcanzado recibe 2050 de daño y arde 8 s (75 por segundo), sin poder golpear y andando despacio.
- 90 disparos. Solo lo rellenan la Munición máxima y volver a construirlo: **ninguna carta le da ni le devuelve balas**.

---

## Otras reglas

| | |
|---|---|
| **Caos** | Hasta 31 zombies vivos a la vez (24 de serie), salen cada 0.5 s como mucho, rondas ×1.5. |
| **Tanques** | Desde la ronda 3, los zombies que salen andando tienen ×4 de vida y golpe ×2 (120). Un 10 % de los rápidos se convierte en tanque. |
| **Super sprinters** | Desde la ronda 3, un 20 % de los rápidos van en super sprint acelerado (más rápidos que tú corriendo), máximo 6 a la vez. |
| **Vida de zombies** | Empiezan con 188 (150 de serie, +25 %), +130 por ronda hasta la 9 y ×1.13 desde la 10. Ronda 10: 1387 (de serie 1045); ronda 20: 4699 (de serie 2701); ronda 30: 15 943 (de serie 7000). Tabla completa en [ARQUETIPOS.md](ARQUETIPOS.md). |
| **Marcador (Tab)** | La columna Headshots muestra el nivel de cartas de cada jugador. |

---

## Controles

| | Teclado | Mando |
|---|---|---|
| Mover la selección | Apuntar / Disparar (o A / D) | LT / RT |
| Elegir | F o cuchillo | X (Cuadrado) o cuchillo |
| Cambiar las cartas (reroll) | Granada (G) | RB |
| Bloquear la carta marcada | Táctica (Q) | LB |
| Lista de cartas (mostrar / ocultar) | La tecla que asignes con `bind h +actionslot 2` | Cruceta abajo o Select |
| Construir el bastón | USAR (F) en la mesa | X (Cuadrado) en la mesa |
| Sacar el kit de torreta (Mecánico) | Tecla de acción 1 (la que indica el juego) y disparar para plantarla | Cruceta arriba y RT |
| Recoger o reparar tu torreta | Mantener USAR (F) junto a ella | Mantener X (Cuadrado) junto a ella |

---

## Consola (para probar)

Se escriben en la consola antes de entrar o antes de `map_restart`.

| Comando | Qué hace |
|---|---|
| `set jodas_cartas_base 5` | Primera carta a las 5 bajas (`jodas_cartas_paso 0`: todas a la misma distancia). |
| `set jodas_mitica_pct 100` | Siempre sale una mítica. |
| `set jodas_mitica_forzar bruja` | La mítica que sale es esa (`bomberman`, `fenix`, `cristal`, `zeus`, `midas`, `infinito`, `bruja`). |
| `set jodas_dar_arma slipgun_zm` | En partida: da esa arma con munición a todos los jugadores (`slipgun_zm` Sliquifier, `slowgun_zm` Paralizador, `ray_gun_zm`, `staff_fire_zm`, `staff_fire_upgraded_zm`...). |
| `set jodas_max_cartas 3` | Número de huecos de carta (15 por defecto; Pistolas suma `jodas_pistolas_huecos`, 0). |
| `set jodas_zombies_extra_jugador 0.2` | Zombies extra por cada jugador por encima de 4 (20 % por defecto). |
| `set jodas_arq_nivel 1` | Elegir arquetipo en la primera subida de nivel (8 por defecto). |
| `set jodas_bruja_minutos 1` | Hora bruja cada minuto (3 por defecto). |
| `set jodas_arq_forzar piromano` | Ese arquetipo sale siempre en el menú (`piromano`, `electricista`, `berserker`, `francotirador`, `tanque`, `banquero`, `gatillo`, `velocista`, `domador`, `suertudo`, `mecanico`). |
| `set jodas_carta_forzar fosforo` | Esa carta va la primera en cada oferta si se puede ofrecer (ids: `fosforo`, `napalm`, `rescoldos`, `mecha`, `pirotecnico`, `pararrayos`, `sobrecarga`, `condensador`, `tormenta`, `tesla`, `furia`, `sangre`, `ultimo`, `imparable`, `pulso`, `unabala`, `elites`, `piedra`, `coraza`, `masa`, `coloso`, `interes`, `mercenario`, `cajaeco`, `plutocrata`, `tambor`, `plomo`, `cinta`, `continuo`, `resbaladizo`, `zancada`, `estela`, `ciclon`, `silbato`, `correa`, `collar`, `carne`, `manada`, `alfa`, `conejo`, `dados`, `amuleto`, `herradura`, `jackpot`, `herramientas`, `engranajes`, `recargatorreta`, `calibre50`, `rebote`, `montaje`, `mortero`). |
| `set jodas_arq_pct 80` | % de cartas de arquetipo en cada oferta (35 por defecto). |
| `set jodas_fuego_pct 10` | Daño del fuego por segundo, en % de la vida del zombie (4 por defecto). |
| `set jodas_rerolls 10` | Rerolls por partida (3 por defecto). |
| `set jodas_caida_penal 0` | Sin penalización al caer. |
| `set jodas_jefe_minutos 1` | Jefe cada minuto. |
| `set jodas_baston_piezas 1` | Bastón con una sola pieza. |
| `set jodas_lista_tecla siempre` | Lista de cartas siempre visible. |
| `set jodas_sprint 1` | Todos los zombies corren (2 = super sprint). |
| `set jodas_caja_cartas 0` | Caja original (armas). |
| `set jodas_caja_max 50000` | Precio máximo de la caja (999999 por defecto). |
| `set jodas_mark2_pct 100` | % por ronda de que Pistolas reciba la Ray Gun Mark II (1 por defecto). |
| `set jodas_super_pct 0` | Sin super sprinters. |
| `set jodas_torreta_bajas 10` | Bajas que aguanta una torreta antes de romperse (100 por defecto). |
| `set jodas_torreta_reparar 100` | Coste de reparar una torreta (2500 por defecto). |
| `set jodas_torreta_pct 6` | Daño de cada bala de torreta, en % de la vida de un zombie de la ronda (mínimo 300). |
| `set jodas_torreta_cargador 30` | Balas por cargador de la torreta (`jodas_torreta_recarga 4`: segundos de recarga). |
| `set jodas_torreta_xp 0.75` | Cuánto cuenta cada baja de torreta para subir de nivel. |
| `set jodas_mortero_cada 8` | Segundos entre morteros de cada torreta (`jodas_mortero_mult 2.5`: daño respecto a una bala). |
| `set jodas_debug_torreta 1` | En partida: cada 2 s, el estado de tus torretas en pantalla. |
| `set jodas_leroy_robos 3` | Cartas que Leroy puede robar a cada jugador. |
| `set jodas_leroy_cuenco 15` | Segundos para recoger los cuencos de Leroy. |
| `set jodas_textos_limite 100` | Cada cuántos textos nuevos se vacía la tabla de textos del juego (arreglo del overflow). |
| `set jodas_bonus_escopetas 7.5` | Bonus de puntos por baja de Escopetas en % de la vida del zombie (`jodas_bonus_pistolas 5.1`, `jodas_bonus_rifles 0.13`). |
| `set jodas_rifles_ejecutor 20` | % de vida por debajo del cual los Rifles rematan al zombie (`jodas_smr_mult 4`: daño del SMR). |
| `set jodas_auto_racha_max 15` | Tope de la racha de Automáticas (`jodas_auto_doble 25`: % de gastar 2 balas). |
| `set jodas_off 1` | Desactiva el mod. |

---

## Problemas conocidos

- La fuente del juego no tiene el símbolo `%`: en pantalla se escribe `pct` (por ejemplo `+6 pct`). Se puede cambiar con `set jodas_pct "por ciento"`.
- Las armas de otros mapas usan el camuflaje de Pack-a-Punch de su mapa de origen.
- El zombie que arde con el bastón anda en vez de tambalearse (Pueblo no tiene esas animaciones).
- Tab no se puede usar para la lista de cartas: el juego no deja leer esa tecla desde un mod. Por eso va con `bind h +actionslot 2`.
- Si tienes otros scripts en `%localappdata%\Plutonium\storage\t6\raw\scripts\` (por ejemplo B2OP), se cargan junto con el mod y pueden interferir.
