# bo2jodas: arquetipos, cartas y números

Generado por `tools/generar_diagramas.py` a partir de los scripts del mod (valores de las cartas y configuración por defecto) y de los archivos de arma del juego. Los diagramas se ven en GitHub o con una extensión de Mermaid.

Todas las cartas normales se **acumulan**: cada vez que coges una, su valor se suma hasta el tope. Los valores son por rareza: común / poco común / rara / épica / legendaria.

## Vida de los zombies por ronda

Fórmula del juego con los valores del mod: ronda 1 = 188; cada ronda hasta la 9 suma 130; desde la 10 se multiplica por 1.13 (truncando). Tanque = ×4 la vida del zombie de su ronda. Jefes: Brutus ×70, Bruja ×40, Leroy ×50; ningún golpe les quita más del 15 % de su vida.

| Ronda | Zombie (mod) | Zombie (de serie) | Tanque | Brutus | Bruja | Leroy | Tope por golpe al jefe |
|---|---|---|---|---|---|---|---|
| 1 | 188 | 150 | 752 | 13160 | 7520 | 9400 | 1974 |
| 5 | 708 | 550 | 2832 | 49560 | 28320 | 35400 | 7434 |
| 10 | 1387 | 1045 | 5548 | 97090 | 55480 | 69350 | 14563 |
| 20 | 4699 | 2701 | 18796 | 328930 | 187960 | 234950 | 49339 |
| 30 | 15943 | 7000 | 63772 | 1116010 | 637720 | 797150 | 167401 |
| 40 | 54111 | 18151 | 216444 | 3787770 | 2164440 | 2705550 | 568165 |
| 50 | 183674 | 47073 | 734696 | 12857180 | 7346960 | 9183700 | 1928577 |

```mermaid
xychart-beta
    title "Vida del zombie por ronda (mod frente a de serie)"
    x-axis "Ronda" [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]
    y-axis "Vida"
    line "mod" [188,318,448,578,708,838,968,1098,1228,1387,1567,1770,2000,2260,2553,2884,3258,3681,4159,4699,5309,5999,6778,7659,8654,9779,11050,12486,14109,15943,18015,20356,23002,25992,29370,33188,37502,42377,47886,54111,61145,69093,78075,88224,99693,112653,127297,143845,162544,183674]
    line "de serie" [150,250,350,450,550,650,750,850,950,1045,1149,1263,1389,1527,1679,1846,2030,2233,2456,2701,2971,3268,3594,3953,4348,4782,5260,5786,6364,7000,7700,8470,9317,10248,11272,12399,13638,15001,16501,18151,19966,21962,24158,26573,29230,32153,35368,38904,42794,47073]
```

## Cómo se construye una build

```mermaid
stateDiagram-v2
    [*] --> Clase: al empezar (Escopetas, Automaticas, Rifles, Pistolas)
    Clase --> Niveles1a7: cartas generales (primera a las 9 bajas, +5 por nivel)
    Niveles1a7 --> Arquetipo: nivel 8 (3 de los 10 al azar)
    Arquetipo --> Bienvenida: 3 cartas de tu arquetipo, eliges 1
    Bienvenida --> Mezcla: cada hueco de la oferta 35% de arquetipo (+1% por Trebol) y el resto general
    Mezcla --> Build: 15 huecos (15 Pistolas) + 1 mitica aparte
    Mezcla --> Firma: con las 2 cartas que pide, aparece la firma del arquetipo
    Build --> Caida: al caer pierdes 1 tipo de carta entero (eliges entre 3)
    Caida --> Mezcla
```

Rarezas: común 50 %, poco común 28 %, rara 14 %, épica 6 %, legendaria 2 %; Trébol y Pulsera suben escalones. Mítica: 5 % de que una carta de la oferta sea mítica (una por jugador, no ocupa hueco).

## Cómo se calcula el daño de un disparo

Tal cual lo hace `jodas_danio_saliente` + `jodas_arq_mult_saliente`. Todos los porcentajes de cartas **se suman** en un único multiplicador; sólo después se aplican los factores (×3, Cuerpo de cristal, crítico).

```mermaid
flowchart TD
    A["Dano base del arma<br/>(ya multiplicado por la zona: locHead del arma)"] --> B["mult = 1 + (Calibre + Gatillo loco [x2 con Double Tap comprado]) / 100"]
    B --> C["Clase: Escopetas 15% (35% con francotirador) de MATAR de un tiro (al jefe x3) · Automaticas +0.5% por acierto seguido hasta +15% · Pistolas +40% · Rifles (Ejecutor): la bala que deja al zombie por debajo del 20% lo MATA (no al jefe); SMR x4"]
    C --> D["+ Polvora si es explosion (y x1.5 con Bomberman)<br/>+ Nudillos si es cuchillo, si no + Ojo de halcon si es cabeza"]
    D --> E["+ Adrenalina (menos de media vida) + Punteria (apuntando) + Ultimas balas (cargador < 30%) + Cazatanques (tanque) + Combo x bajas seguidas (max 10)"]
    E --> F["+ Furia x golpes (max 3) + Ultimo aliento (+100%) + Pulso firme + Tambor + Plomo + Sangre fria + Madrugador + Interes + Plutocrata (6% por bebida) + Mecha corta (granada)"]
    F --> G{"Una bala basta: cabeza, lejos y vida baja?"}
    G -->|si| H["MATA (vida + 666)"]
    G -->|no| I["x3 Cazador de elites (cabeza a tanque o jefe) · x3 Coloso (cuchillo quieto)"]
    I --> J["x3 Cuerpo de cristal"] --> K["x2.5 si salta Golpe critico"] --> L["Dano final = base x mult (jefe: tope 15% de su vida)"]
```

Los rayos (Electricista), el fuego, Espinas, Ciclón, los mordiscos de leaper, la Reacción en cadena, Zeus, Fénix y Electric Cherry parten de un % de la vida del zombie (o de un daño fijo) y **también** pasan por esta fórmula: Calibre, Gatillo loco, Adrenalina, Cuerpo de cristal y demás los multiplican. Las cartas que piden bala, cabeza o cuchillo no cuentan en ellos.

## Los 10 arquetipos de un vistazo

Cada arquetipo tiene 6 cartas; la **firma** sólo aparece cuando tienes las dos que pide (flechas `requiere`). Las que ya existían antes de la 1.8 van marcadas con *.

```mermaid
flowchart LR
    subgraph piromano["Piromano: Fuego que se contagia y explosivos"]
        explosivo["Polvora*<br/>+8% / +12% / +20% / +32% / +48%"]
        fosforo["Fosforo<br/>6% / 9% / 13% / 18% / 26%"]
        napalm["Napalm<br/>15% / 22% / 30% / 42% / 60%"]
        rescoldos["Rescoldos<br/>+4 / +6 / +9 / +13 / +18"]
        mecha["Mecha corta<br/>+20% / +30% / +45% / +65% / +90%"]
        pirotecnico["Pirotecnico (firma)<br/>FIRMA (una vez)"]
    end
    subgraph electricista["Electricista: Rayos que saltan de zombie en zombie"]
        cadena["Reaccion en cadena*<br/>3% / 5% / 7% / 10% / 16%"]
        pararrayos["Pararrayos<br/>8% / 12% / 17% / 24% / 34%"]
        sobrecarga["Sobrecarga<br/>25% / 35% / 50% / 70% / 100%"]
        condensador["Condensador<br/>50% / 70% / 100% / 140% / 200%"]
        tormenta["Tormenta<br/>12% / 16% / 22% / 30% / 42%"]
        tesla["Tesla (firma)<br/>FIRMA (una vez)"]
    end
    subgraph berserker["Berserker: Cuanto mas herido, mas peligroso"]
        vampiro["Vampiro*<br/>+2 / +3 / +4 / +6 / +10"]
        adrenalina["Adrenalina*<br/>+6% / +10% / +14% / +20% / +32%"]
        furia["Furia<br/>+5% / +8% / +11% / +15% / +22%"]
        sangre["Sangre caliente<br/>+2 / +3 / +4 / +6 / +9"]
        ultimo["Ultimo aliento<br/>3 s / 4 s / 5 s / 6 s / 8 s"]
        imparable["Imparable (firma)<br/>FIRMA (una vez)"]
    end
    subgraph francotirador["Francotirador: Tiros a la cabeza lentos y letales"]
        cabeza["Ojo de halcon*<br/>+8% / +12% / +20% / +32% / +48%"]
        punteria["Punteria*<br/>+4% / +6% / +10% / +14% / +20%"]
        cazatanques["Cazatanques*<br/>+12% / +20% / +32% / +48% / +72%"]
        pulso["Pulso firme<br/>+15% / +22% / +32% / +45% / +65%"]
        unabala["Una bala basta<br/>25% / 35% / 45% / 60% / 80%"]
        elites["Cazador de elites (firma)<br/>FIRMA (una vez)"]
    end
    subgraph tanque["Tanque: x2 vida con Jugg y escudo nuevo cada ronda"]
        melee["Nudillos de hierro*<br/>+40% / +65% / +95% / +145% / +240%"]
        espinas["Espinas*<br/>12% / 20% / 32% / 48% / 72%"]
        piedra["Piel de piedra<br/>-10% / -15% / -20% / -28% / -40%"]
        coraza["Coraza<br/>-5 / -8 / -12 / -18 / -25"]
        masa["Masa<br/>+5 / +8 / +12 / +16 / +24"]
        coloso["Coloso (firma)<br/>FIRMA (una vez)"]
    end
    subgraph banquero["Banquero: Los puntos son poder"]
        puntos["Codicia*<br/>+4 / +8 / +12 / +20 / +32"]
        oro["Cabezas de oro*<br/>+8 / +12 / +20 / +32 / +48"]
        interes["Interes compuesto<br/>10% / 15% / 20% / 25% / 35%"]
        mercenario["Mercenario<br/>+200 / +300 / +400 / +600 / +800"]
        cajaeco["Caja economica<br/>-10% / -15% / -20% / -30% / -40%"]
        plutocrata["Plutocrata (firma)<br/>FIRMA (una vez)"]
    end
    subgraph gatillo["Gatillo: Disparar sin parar y sin recargar"]
        cadencia["Gatillo loco*<br/>+2% / +4% / +6% / +10% / +14%"]
        ultimas["Ultimas balas*<br/>+8% / +12% / +18% / +24% / +36%"]
        tambor["Tambor caliente<br/>+8% / +12% / +18% / +25% / +36%"]
        plomo["Plomo<br/>10% / 15% / 20% / 30% / 40%"]
        cinta["Cinta de balas<br/>+2 / +3 / +4 / +6 / +8"]
        continuo["Fuego continuo (firma)<br/>FIRMA (una vez)"]
    end
    subgraph velocista["Velocista: Correr, esquivar y no parar"]
        escurridizo["Escurridizo*<br/>0.4 s / 0.6 s / 1.0 s / 1.3 s / 1.8 s"]
        sed["Sed de sangre*<br/>+4% / +6% / +10% / +13% / +18%"]
        resbaladizo["Resbaladizo<br/>+5% / +8% / +12% / +16% / +24%"]
        zancada["Zancada<br/>+4% / +6% / +9% / +12% / +18%"]
        estela["Estela<br/>30% / 40% / 50% / 60% / 75%"]
        ciclon["Ciclon (firma)<br/>FIRMA (una vez)"]
    end
    subgraph domador["Domador: Leapers que luchan por ti"]
        silbato["Silbato<br/>1 / 1 / 1 / 1 / 1"]
        correa["Correa larga<br/>+10% / +15% / +20% / +30% / +40%"]
        collar["Collar de puas<br/>+15% / +25% / +35% / +50% / +70%"]
        carne["Carne fresca<br/>+3 / +5 / +7 / +10 / +15"]
        manada["Manada<br/>+1 / +1 / +1 / +1 / +1"]
        alfa["Alfa (firma)<br/>FIRMA (una vez)"]
    end
    subgraph mecanico["Mecanico: Torretas que disparan por ti"]
        herramientas["Caja de herramientas<br/>1 / 1 / 1 / 1 / 1"]
        engranajes["Engranajes<br/>+10% / +15% / +22% / +30% / +42%"]
        recargatorreta["Recarga rapida<br/>-10% / -15% / -22% / -30% / -40%"]
        calibre50["Calibre .50<br/>+15% / +25% / +35% / +50% / +70%"]
        rebote["Rebote<br/>10% / 15% / 22% / 30% / 40%"]
        montaje["Cadena de montaje<br/>+1 / +1 / +1 / +1 / +1"]
        mortero["Mortero (firma)<br/>FIRMA (una vez)"]
    end
    subgraph suertudo["Suertudo: Rerolls, dados y cartas mejores"]
        botin["Buscador de botin*<br/>0.4% / 0.8% / 1.2% / 2.0% / 3.2%"]
        conejo["Pata de conejo<br/>+1 / +2 / +2 / +3 / +4"]
        dados["Dados<br/>15% / 22% / 30% / 42% / 60%"]
        amuleto["Amuleto<br/>20% / 30% / 45% / 60% / 80%"]
        herradura["Herradura<br/>20% / 30% / 45% / 60% / 80%"]
        jackpot["Jackpot (firma)<br/>FIRMA (una vez)"]
    end
    fosforo -->|requiere| pirotecnico
    explosivo -->|requiere| pirotecnico
    pararrayos -->|requiere| tesla
    condensador -->|requiere| tesla
    adrenalina -->|requiere| imparable
    furia -->|requiere| imparable
    cabeza -->|requiere| elites
    pulso -->|requiere| elites
    espinas -->|requiere| coloso
    piedra -->|requiere| coloso
    puntos -->|requiere| plutocrata
    interes -->|requiere| plutocrata
    tambor -->|requiere| continuo
    plomo -->|requiere| continuo
    sed -->|requiere| ciclon
    estela -->|requiere| ciclon
    silbato -->|requiere| correa
    silbato -->|requiere| collar
    silbato -->|requiere| carne
    silbato -->|requiere| manada
    collar -->|requiere| alfa
    manada -->|requiere| alfa
    herramientas -->|requiere| engranajes
    herramientas -->|requiere| recargatorreta
    herramientas -->|requiere| calibre50
    herramientas -->|requiere| rebote
    herramientas -->|requiere| montaje
    calibre50 -->|requiere| mortero
    montaje -->|requiere| mortero
    dados -->|requiere| jackpot
    conejo -->|requiere| jackpot
```

## Cada arquetipo en detalle

### Piromano: Fuego que se contagia y explosivos

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Polvora | Potencia de los explosivos | +8% / +12% / +20% / +32% / +48% | +400% | variable |
| Fosforo | Probabilidad de que tus balas incendien | 6% / 9% / 13% / 18% / 26% | 80% | variable |
| Napalm | Un zombie ardiendo contagia: % por s | 15% / 22% / 30% / 42% / 60% | 100% | variable |
| Rescoldos | Vida al matar a un zombie ardiendo | +4 / +6 / +9 / +13 / +18 | +60 | variable |
| Mecha corta | Granadas: estallan al caer y hacen +% | +20% / +30% / +45% / +65% / +90% | +300% | variable |
| **Pirotecnico** | FIRMA: tus explosiones incendian a todos | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    explosivo["Polvora"]
    fosforo["Fosforo"]
    napalm["Napalm"]
    rescoldos["Rescoldos"]
    mecha["Mecha corta"]
    pirotecnico{{"Pirotecnico (firma)"}}
    BALAS(["Impactos de bala (MOD_RIFLE_BULLET / MOD_PISTOL_BULLET)"])
    EXPLO(["Explosiones: granadas, Mecha corta, Bomberman, Reaccion en cadena, PhD"])
    FUEGO(["Zombie ardiendo: pierde 4% de su vida maxima por segundo durante 6 s (cada impacto reinicia). El jefe, un cuarto. Al apagarse queda quemado: el Napalm ya no lo contagia"])
    BALAS -->|"6-26% por impacto (tope 80%)"| fosforo
    fosforo -->|"prende (impacto directo: tambien a quemados)"| FUEGO
    FUEGO -->|"cada segundo, por zombie a menos de 80 u"| napalm
    napalm -->|"15-60% de contagiar (no a quemados)"| FUEGO
    FUEGO -->|"baja de un zombie ardiendo: +4-18 vida (tope 60)"| rescoldos
    mecha -->|"granada estalla al pararse, +20-90% (tope 300%)"| EXPLO
    explosivo -->|"+8-48% a todo lo explosivo (tope 400%)"| EXPLO
    fosforo -->|"requiere"| pirotecnico
    explosivo -->|"requiere"| pirotecnico
    EXPLO -->|"cada zombie alcanzado por una explosion tuya"| pirotecnico
    pirotecnico -->|"prende (impacto directo)"| FUEGO
```

### Electricista: Rayos que saltan de zombie en zombie

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Reaccion en cadena | Probabilidad de que el zombie explote | 3% / 5% / 7% / 10% / 16% | 60% | variable |
| Pararrayos | % de rayo al matar: 15% vida a otro | 8% / 12% / 17% / 24% / 34% | 80% | variable |
| Sobrecarga | Al recargar, rayo al mas cercano: % vida | 25% / 35% / 50% / 70% / 100% | 200% | variable |
| Condensador | 10 bajas sin dano: 3 rayos de % vida | 50% / 70% / 100% / 140% / 200% | 300% | variable |
| Tormenta | Descarga alrededor: % vida, y mas seguido | 12% / 16% / 22% / 30% / 42% | 90% | variable |
| **Tesla** | FIRMA: todos tus rayos alcanzan a 2 mas | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    cadena["Reaccion en cadena"]
    pararrayos["Pararrayos"]
    sobrecarga["Sobrecarga"]
    condensador["Condensador"]
    tormenta["Tormenta"]
    tesla{{"Tesla (firma)"}}
    BAJA(["Baja tuya (cualquier arma)"])
    DISPARO(["Siguiente impacto de bala"])
    RECARGA(["Empezar a recargar"])
    RAYO(["Rayo: dano fijo en % de la vida maxima del zombie (100% o mas = mata; al jefe 15%) y luego se multiplica por tus cartas de dano. Alcance 350 u"])
    BAJA -->|"8-34% (tope 80%)"| pararrayos
    pararrayos -->|"1 rayo del 15% a otro zombie"| RAYO
    BAJA -->|"3-16% (tope 60%): explosion de 0.6x vida de ronda + 100 a 160 u"| cadena
    RECARGA -->|"maximo 1 por segundo"| sobrecarga
    sobrecarga -->|"1 rayo de 25-100% (tope 200%) al mas cercano"| RAYO
    BAJA -->|"10 bajas seguidas sin recibir dano lo cargan"| condensador
    DISPARO -->|"con carga: la gasta"| condensador
    condensador -->|"3 rayos de 50-200% (tope 300%)"| RAYO
    tormenta -->|"cada 4.5 s menos 0.03 s por punto (min 1.5 s): 12-42% (tope 90%) a todos a 160 u y 1 s al 50% de velocidad"| RAYO
    pararrayos -->|"requiere"| tesla
    condensador -->|"requiere"| tesla
    tesla -->|"todos los rayos (y los de Ira de Zeus) alcanzan a 2 zombies mas"| RAYO
```

### Berserker: Cuanto mas herido, mas peligroso

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Vampiro | Vida por baja | +2 / +3 / +4 / +6 / +10 | +60 | variable |
| Adrenalina | +% potencia con menos de media vida | +6% / +10% / +14% / +20% / +32% | +200% | variable |
| Furia | +% potencia 5 s por golpe recibido (x3) | +5% / +8% / +11% / +15% / +22% | +60% | variable |
| Sangre caliente | Vida por segundo con menos de media vida | +2 / +3 / +4 / +6 / +9 | +40 | variable |
| Ultimo aliento | Bajo 25% vida: s de invulnerable, 1/ronda | 3 s / 4 s / 5 s / 6 s / 8 s | 12 s | variable |
| **Imparable** | FIRMA: bajo 25% vida +20% vel, golpes -50% | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    vampiro["Vampiro"]
    adrenalina["Adrenalina"]
    furia["Furia"]
    sangre["Sangre caliente"]
    ultimo["Ultimo aliento"]
    imparable{{"Imparable (firma)"}}
    BAJA(["Baja tuya (cualquier arma)"])
    GOLPE(["Golpe de zombie recibido"])
    VIDA(["Tu vida (100, 250 con Juggernog, 500 si eres Tanque con Juggernog)"])
    VIDA -->|"con menos de la mitad: +6-32% dano (tope 200%)"| adrenalina
    VIDA -->|"con menos de la mitad: +2-9 vida/s (tope 40)"| sangre
    GOLPE -->|"+5-22% dano 5 s, acumula hasta 3 golpes (tope 60% por golpe)"| furia
    VIDA -->|"al bajar del 25% o golpe mortal, 1 vez por ronda: 3-8 s (tope 12) invulnerable y +100% dano"| ultimo
    BAJA -->|"+2-10 vida por baja (tope 60)"| vampiro
    adrenalina -->|"requiere"| imparable
    furia -->|"requiere"| imparable
    VIDA -->|"con menos del 25%: +20% velocidad y los golpes hacen la mitad"| imparable
```

### Francotirador: Tiros a la cabeza lentos y letales

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Ojo de halcon | Potencia en tiros a la cabeza | +8% / +12% / +20% / +32% / +48% | +400% | variable |
| Punteria | +% potencia apuntando con la mira | +4% / +6% / +10% / +14% / +20% | +100% | variable |
| Cazatanques | +% potencia contra tanques | +12% / +20% / +32% / +48% / +72% | +400% | variable |
| Pulso firme | +% potencia tras 2 s sin disparar | +15% / +22% / +32% / +45% / +65% | +200% | variable |
| Una bala basta | Cabeza lejos mata si al zombie le queda <% | 25% / 35% / 45% / 60% / 80% | 100% | variable |
| **Cazador de elites** | FIRMA: cabeza a tanque o jefe hace x3 | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    cabeza["Ojo de halcon"]
    punteria["Punteria"]
    cazatanques["Cazatanques"]
    pulso["Pulso firme"]
    unabala["Una bala basta"]
    elites{{"Cazador de elites (firma)"}}
    QUIETO2S(["2 s sin disparar"])
    MIRA(["Apuntando con la mira"])
    CABEZA(["Tiro a la cabeza (head / helmet; el arma ya multiplica por su locHead)"])
    ELITE(["Tanque (x4 vida) o jefe"])
    MATA(["Muerte instantanea"])
    CABEZA -->|"+8-48% (tope 400%)"| cabeza
    MIRA -->|"apuntando: +4-20% (tope 100%)"| punteria
    ELITE -->|"solo tanques: +12-72% (tope 400%)"| cazatanques
    QUIETO2S -->|"+15-65% (tope 200%)"| pulso
    CABEZA -->|"y a mas de 600 u, no al jefe"| unabala
    unabala -->|"mata si le queda menos del 25-80% de vida (tope 100%)"| MATA
    cabeza -->|"requiere"| elites
    pulso -->|"requiere"| elites
    ELITE -->|"cabeza a tanque o jefe: dano x3 (el jefe sigue con tope del 15% por golpe)"| elites
```

### Tanque: x2 vida con Jugg y escudo nuevo cada ronda

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Nudillos de hierro | Potencia cuerpo a cuerpo | +40% / +65% / +95% / +145% / +240% | +3000% | variable |
| Espinas | Quien te golpea pierde % de su vida | 12% / 20% / 32% / 48% / 72% | 500% | variable |
| Piel de piedra | -% dano recibido estando quieto | -10% / -15% / -20% / -28% / -40% | -60% | variable |
| Coraza | Cada golpe de zombie hace esto menos | -5 / -8 / -12 / -18 / -25 | -60 | variable |
| Masa | +vida maxima por cada carta de Tanque | +5 / +8 / +12 / +16 / +24 | +60 | variable |
| **Coloso** | FIRMA: quieto reflejas todo; cuchillo x3 | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    melee["Nudillos de hierro"]
    espinas["Espinas"]
    piedra["Piel de piedra"]
    coraza["Coraza"]
    masa["Masa"]
    coloso{{"Coloso (firma)"}}
    GOLPE(["Golpe de zombie recibido (60; tanque x2; jefe x2.5)"])
    PASIVA(["Pasiva del arquetipo: vida x2 con Juggernog (500) y escudo de zombies (2250 de dano) en la espalda, nuevo o reparado cada ronda"])
    CUCHILLO(["Cuchillo"])
    QUIETO(["Quieto (velocidad &lt; 10)"])
    GOLPE -->|"el zombie pierde 12-72% de su vida (tope 500%)"| espinas
    CUCHILLO -->|"+40-240% (tope 3000%)"| melee
    QUIETO -->|"golpes -10-40% (tope 60%)"| piedra
    GOLPE -->|"cada golpe hace 5-25 menos (tope 60; minimo 1)"| coraza
    masa -->|"+5-24 vida maxima por cada carta de Tanque que tengas, Masa incluida (tope 60 por carta)"| PASIVA
    espinas -->|"requiere"| coloso
    piedra -->|"requiere"| coloso
    QUIETO -->|"quieto: Espinas pasa a 100% (el zombie que te golpea muere) y el cuchillo hace x3"| coloso
```

### Banquero: Los puntos son poder

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Codicia | Puntos extra por baja | +4 / +8 / +12 / +20 / +32 | +300 | variable |
| Cabezas de oro | Puntos extra por baja a la cabeza | +8 / +12 / +20 / +32 / +48 | +400 | variable |
| Interes compuesto | +1% potencia por cada 1000 puntos (tope %) | 10% / 15% / 20% / 25% / 35% | 50% | variable |
| Mercenario | Cada 50 bajas tuyas +puntos a todos | +200 / +300 / +400 / +600 / +800 | +2000 | variable |
| Caja economica | La caja te cuesta menos | -10% / -15% / -20% / -30% / -40% | -60% | variable |
| **Plutocrata** | FIRMA: +6% potencia por perk, +50 puntos | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    puntos["Codicia"]
    oro["Cabezas de oro"]
    interes["Interes compuesto"]
    mercenario["Mercenario"]
    cajaeco["Caja economica"]
    plutocrata{{"Plutocrata (firma)"}}
    BAJA(["Baja tuya"])
    CAJA(["Caja de cartas (2500 x1.17 por tirada)"])
    CABEZA(["Baja a la cabeza"])
    PUNTOS(["Tus puntos (sin gastar)"])
    PERKS(["Bebidas que llevas"])
    BAJA -->|"+4-32 puntos (tope 300)"| puntos
    CABEZA -->|"+8-48 puntos (tope 400)"| oro
    PUNTOS -->|"+1% dano por cada 1000 puntos, tope 10-35% (maximo 50%)"| interes
    BAJA -->|"cada 50 bajas tuyas: +200-800 puntos a todos (tope 2000)"| mercenario
    cajaeco -->|"-10-40% de precio (tope 60%)"| CAJA
    puntos -->|"requiere"| plutocrata
    interes -->|"requiere"| plutocrata
    PERKS -->|"+6% dano por bebida"| plutocrata
    BAJA -->|"+50 puntos por baja"| plutocrata
```

### Gatillo: Disparar sin parar y sin recargar

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Gatillo loco | Double Tap gratis y mas potencia | +2% / +4% / +6% / +10% / +14% | +150% | variable |
| Ultimas balas | +% potencia con el cargador casi vacio | +8% / +12% / +18% / +24% / +36% | +200% | variable |
| Tambor caliente | +% potencia tras 1 s disparando seguido | +8% / +12% / +18% / +25% / +36% | +150% | variable |
| Plomo | +1% potencia por bala seguida (tope %) | 10% / 15% / 20% / 30% / 40% | 100% | variable |
| Cinta de balas | Balas al cargador por baja | +2 / +3 / +4 / +6 / +8 | +20 | variable |
| **Fuego continuo** | FIRMA: con combo 10 el cargador no baja | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    cadencia["Gatillo loco"]
    ultimas["Ultimas balas"]
    tambor["Tambor caliente"]
    plomo["Plomo"]
    cinta["Cinta de balas"]
    continuo{{"Fuego continuo (firma)"}}
    BAJA(["Baja tuya (cualquier arma)"])
    COMBO10(["Combo 10: 10 bajas seguidas con menos de 2 s entre ellas"])
    CARGADOR(["Cargador del arma de la mano"])
    RAFAGA(["Disparando seguido (menos de 0.4 s entre tiros)"])
    DT(["Double Tap comprado"])
    cadencia -->|"da Double Tap gratis y +2-14% dano (tope 150%); con Double Tap comprado el % se dobla"| DT
    CARGADOR -->|"por debajo del 30%: +8-36% (tope 200%)"| ultimas
    RAFAGA -->|"tras 1 s seguido: +8-36% (tope 150%); se pierde al parar 0.5 s"| tambor
    RAFAGA -->|"+1% por bala sin recargar ni cambiar de arma, tope 10-40% (maximo 100%)"| plomo
    BAJA -->|"+2-8 balas al cargador (tope 20)"| cinta
    tambor -->|"requiere"| continuo
    plomo -->|"requiere"| continuo
    COMBO10 -->|"mientras dura el combo 10 el cargador se rellena solo"| continuo
```

### Velocista: Correr, esquivar y no parar

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Escurridizo | Te ignoran tras recibir un golpe | 0.4 s / 0.6 s / 1.0 s / 1.3 s / 1.8 s | 6.0 s | variable |
| Sed de sangre | +% velocidad 3 s tras cada baja | +4% / +6% / +10% / +13% / +18% | +60% | variable |
| Resbaladizo | +% velocidad con 3+ zombies encima | +5% / +8% / +12% / +16% / +24% | +40% | variable |
| Zancada | Stamin-Up gratis y +% vel. esprintando | +4% / +6% / +9% / +12% / +18% | +30% | variable |
| Estela | Esprintando dejas un rastro que frena % | 30% / 40% / 50% / 60% / 75% | 75% | variable |
| **Ciclon** | FIRMA: esprintando danas lo que tocas | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    escurridizo["Escurridizo"]
    sed["Sed de sangre"]
    resbaladizo["Resbaladizo"]
    zancada["Zancada"]
    estela["Estela"]
    ciclon{{"Ciclon (firma)"}}
    BAJA(["Baja tuya"])
    GOLPE(["Golpe de zombie recibido"])
    FRENO(["Zombie frenado (velocidad de animacion reducida; no al jefe ni a uno ya frenado por el Paralizador)"])
    CERCA3(["3 o mas zombies a menos de 150 u"])
    ESPRINT(["Esprintando"])
    BAJA -->|"+4-18% velocidad 3 s (tope 60%)"| sed
    GOLPE -->|"te ignoran 0.4 s-1.8 s (tope 6.0 s)"| escurridizo
    CERCA3 -->|"+5-24% velocidad (tope 40%)"| resbaladizo
    ESPRINT -->|"Stamin-Up gratis y +4-18% velocidad esprintando (tope 30%)"| zancada
    ESPRINT -->|"rastro de 2 s"| estela
    estela -->|"zombie a menos de 60 u del rastro: 30-75% mas lento 2 s (tope 75%)"| FRENO
    sed -->|"requiere"| ciclon
    estela -->|"requiere"| ciclon
    ESPRINT -->|"zombie a menos de 56 u: pierde 25% de su vida cada 0.5 s"| ciclon
```

### Domador: Leapers que luchan por ti

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Silbato | Un leaper cachorro te sigue y muerde | 1 / 1 / 1 / 1 / 1 | 1 | Rara |
| Correa larga | Tus leapers van +% mas rapido | +10% / +15% / +20% / +30% / +40% | +100% | variable |
| Collar de puas | Mordiscos de tus leapers +% | +15% / +25% / +35% / +50% / +70% | +200% | variable |
| Carne fresca | Vida por mordisco letal de tus leapers | +3 / +5 / +7 / +10 / +15 | +50 | variable |
| Manada | +1 leaper (maximo 3) | +1 / +1 / +1 / +1 / +1 | +2 | Rara |
| **Alfa** | FIRMA: al matar, tus leapers x2 e incendian | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    silbato["Silbato"]
    correa["Correa larga"]
    collar["Collar de puas"]
    carne["Carne fresca"]
    manada["Manada"]
    alfa{{"Alfa (firma)"}}
    BAJA(["Baja tuya"])
    LEAPER(["Leaper: mordisco de 1000 (o un tercio de la vida del zombie de la ronda si es mas), no se le puede matar, maximo 3 en total"])
    silbato -->|"1 leaper (sin Silbato las demas no hacen nada; si lo pierdes se van todos)"| LEAPER
    manada -->|"+1 leaper por carta (tope 2)"| LEAPER
    correa -->|"+10-40% velocidad (tope 100%)"| LEAPER
    collar -->|"mordisco +15-70% (tope 200%)"| LEAPER
    LEAPER -->|"mordisco letal: +3-15 vida para ti (tope 50)"| carne
    collar -->|"requiere"| alfa
    manada -->|"requiere"| alfa
    BAJA -->|"3 s: mordiscos x2 y prenden fuego (como Fosforo)"| alfa
```

### Mecanico: Torretas que disparan por ti

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Caja de herramientas | Construyes una torreta automatica | 1 / 1 / 1 / 1 / 1 | 1 | Rara |
| Engranajes | Tus torretas disparan +% mas rapido | +10% / +15% / +22% / +30% / +42% | +100% | variable |
| Recarga rapida | Tus torretas recargan en -% de tiempo | -10% / -15% / -22% / -30% / -40% | -70% | variable |
| Calibre .50 | Balas de tus torretas +% dano | +15% / +25% / +35% / +50% / +70% | +200% | variable |
| Rebote | % de que la bala salte a otro zombie cercano | 10% / 15% / 22% / 30% / 40% | 80% | variable |
| Cadena de montaje | +1 torreta (maximo 3) | +1 / +1 / +1 / +1 / +1 | +2 | Rara |
| **Mortero** | FIRMA: cada 8 s tus torretas lanzan mortero | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    herramientas["Caja de herramientas"]
    engranajes["Engranajes"]
    recargatorreta["Recarga rapida"]
    calibre50["Calibre .50"]
    rebote["Rebote"]
    montaje["Cadena de montaje"]
    mortero{{"Mortero (firma)"}}
    TORRETA(["Torreta: 6% de la vida del zombie de la ronda por bala (minimo 300), cargador de 30, recarga de 4 s, maximo 3 por jugador; sus bajas dan puntos y cuentan x0.75 para subir de nivel, no hace dano a jugadores y los zombies no la atacan"])
    DESGASTE(["A las 100 bajas se rompe: repararla cuesta 2500 (mantener USAR junto a ella)"])
    herramientas -->|"1 torreta (kit en la tecla de accion 1, se coloca como en TranZit; sin esta carta las demas no hacen nada)"| TORRETA
    montaje -->|"+1 torreta por carta (tope 2, maximo 3)"| TORRETA
    engranajes -->|"+10-42% velocidad de disparo (tope 100%)"| TORRETA
    recargatorreta -->|"-10-40% tiempo de recarga (tope 70%)"| TORRETA
    calibre50 -->|"+15-70% dano por bala (tope 200%)"| TORRETA
    TORRETA -->|"10-40% de que la bala salte al zombie mas cercano (4 m) con el 60% del dano (tope 80%)"| rebote
    TORRETA -->|"cada baja de la torreta"| DESGASTE
    calibre50 -->|"requiere"| mortero
    montaje -->|"requiere"| mortero
    TORRETA -->|"cada 8 s cada torreta lanza un mortero al zombie con mas zombies alrededor: 250% del dano de una bala en 160 u"| mortero
```

### Suertudo: Rerolls, dados y cartas mejores

| Carta | Efecto | Valores | Tope | Rareza |
|---|---|---|---|---|
| Buscador de botin | Probabilidad de power-up por baja | 0.4% / 0.8% / 1.2% / 2.0% / 3.2% | 5.0% | variable |
| Pata de conejo | +rerolls ahora y +1 cada 3 niveles | +1 / +2 / +2 / +3 / +4 | +20 | variable |
| Dados | % de que la carta que cojas valga el doble | 15% / 22% / 30% / 42% / 60% | 80% | variable |
| Amuleto | % de ver 4 cartas en vez de 3 | 20% / 30% / 45% / 60% / 80% | 100% | variable |
| Herradura | % de power-up a tus pies al empezar ronda | 20% / 30% / 45% / 60% / 80% | 100% | variable |
| **Jackpot** | FIRMA: 1 legendaria por ronda y rerolls al 50% | FIRMA (una vez) | — | Epica |

```mermaid
flowchart LR
    botin["Buscador de botin"]
    conejo["Pata de conejo"]
    dados["Dados"]
    amuleto["Amuleto"]
    herradura["Herradura"]
    jackpot{{"Jackpot (firma)"}}
    BAJA(["Baja tuya"])
    REROLL(["Rerolls (3 por partida, Granada)"])
    NIVEL(["Subida de nivel (menu de 3 cartas)"])
    RONDA(["Empieza una ronda"])
    BAJA -->|"0.4%-3.2% de soltar power-up (tope 5.0%)"| botin
    conejo -->|"+1-4 rerolls al cogerla (tope 20) y +1 cada 3 niveles"| REROLL
    NIVEL -->|"15-60% de que la carta cogida valga el doble (tope 80%; no a firmas ni Silbato)"| dados
    NIVEL -->|"20-80% de ver 4 cartas en vez de 3 (tope 100%)"| amuleto
    RONDA -->|"20-80% de power-up a tus pies (tope 100%)"| herradura
    dados -->|"requiere"| jackpot
    conejo -->|"requiere"| jackpot
    NIVEL -->|"1 vez por ronda la primera carta ofrecida es LEGENDARIA"| jackpot
    REROLL -->|"la mitad de los rerolls no se gastan"| jackpot
```

## Cartas generales (le salen a todos)

| Carta | Tipo | Efecto | Valores | Tope |
|---|---|---|---|---|
| Piernas ligeras | normal | Velocidad de movimiento | +3% / +5% / +7% / +10% / +16% | +80% |
| Muelles | normal | Saltas mas alto caer no te hiere | +50 / +70 / +105 / +145 / +210 | +700 |
| Calibre | normal | Mas potencia con todas las armas | +5% / +7% / +10% / +14% / +22% | +300% |
| Cargador magico | normal | Probabilidad de no gastar bala | 4% / 6% / 10% / 14% / 20% | 60% |
| Manos rapidas | normal | Speed Cola gratis y recarga al matar | 0.05% / 0.30% / 1.00% / 2.50% / 4.50% | 4.50% |
| Mochila | normal | Balas de reserva por minuto | +5 b/min / +8 b/min / +12 b/min / +18 b/min / +30 b/min | +60 b/min |
| Corazon de hierro | normal | Vida maxima | +8 / +12 / +20 / +32 / +48 | +400 |
| Regeneracion | normal | Vida por segundo | +1 / +1 / +2 / +3 / +5 | +25 |
| Blindaje | normal | Golpes de zombie hacen menos | -3% / -5% / -7% / -10% / -14% | -60% |
| Golpe critico | normal | Probabilidad de golpe x2.5 | 2% / 4% / 6% / 10% / 14% | 60% |
| Iman | normal | Atrae power-ups en este radio | 250 / 360 / 520 / 720 / 1040 | 5000 |
| Segundo aliento | normal | Probabilidad de evitar caer | 8% / 12% / 18% / 24% / 36% | 90% |
| Suerte del Pack | normal | Arma de ronda mejorada | 4% / 6% / 10% / 14% / 20% | 100% |
| Granadero | normal | Recuperar granada al matar | 2% / 4% / 6% / 10% / 14% | 60% |
| Afortunado | normal | Arma especial de tu clase | +2% / +4% / +6% / +10% / +14% | +70% |
| Trebol | normal | Las cartas salen de mas rareza | 2% / 4% / 6% / 10% / 14% | 60% |
| Experiencia | normal | Cada baja cuenta +% para las cartas | +10% / +15% / +22% / +30% / +45% | +150% |
| Combo | normal | +% potencia por baja seguida (max 10) | +1% / +2% / +2% / +3% / +5% | +20% |
| Monos | equipo | equipo cymbal_monkey_zm | +1/ronda / +1/ronda / +1/ronda / +1/ronda / +1/ronda | +3/ronda |
| Claymores | equipo | equipo claymore_zm | +1/ronda / +1/ronda / +1/ronda / +1/ronda / +1/ronda | +3/ronda |
| Semtex | equipo | equipo sticky_grenade_zm | +1/ronda / +1/ronda / +1/ronda / +1/ronda / +1/ronda | +3/ronda |
| Granadas EMP | equipo | equipo emp_grenade_zm | +1/ronda / +1/ronda / +1/ronda / +1/ronda / +1/ronda | +3/ronda |
| Pack-a-Punch | instantanea | Mejora el arma que llevas en la mano | 0 / 0 / 0 / 0 / 0 | 1 |
| Municion maxima | powerup | power-up full_ammo | — | — |
| Instakill | powerup | power-up insta_kill | — | — |
| Doble puntos | powerup | power-up double_points | — | — |
| Carpintero | powerup | power-up carpenter | — | — |
| Nuke | powerup | power-up nuke | — | — |
| Armadura | normal | Golpes que absorbes del todo cada ronda | +1 / +1 / +2 / +2 / +3 | +6 |
| Sangre fria | normal | +% dano sin zombies a menos de 4 m | +6% / +10% / +14% / +20% / +30% | +100% |
| Medico | normal | Al reanimar, vida para los dos y os ignoran 2 s | +20 / +30 / +45 / +65 / +100 | +250 |
| Madrugador | normal | +% dano los primeros 30 s de cada ronda | +8% / +12% / +18% / +25% / +36% | +100% |
| Cordones nuevos | relleno | Velocidad de movimiento | +1% / +1% / +2% / +2% / +3% | +10% |
| Cantimplora | relleno | Vida maxima | +2 / +3 / +4 / +6 / +8 | +30 |
| Calderilla | relleno | Puntos extra por baja | +5 / +8 / +10 / +15 / +20 | +100 |
| Pulsera de la suerte | relleno | Las cartas salen de mas rareza | 1% / 1% / 2% / 2% / 3% | 10% |
| Medalla | instantanea | Subes de nivel ahora mismo | +1 niveles / +1 niveles / +1 niveles / +2 niveles / +3 niveles | +99 niveles |

Míticas (una por jugador, 5 % por oferta): **Bomberman** (Explosivos mejorados x1.5 recibes x2 (zombies y bombas)); **Fenix** (Renaces y explotas 1 vez por ronda); **Cuerpo de cristal** (Tu potencia x3 recibes x1.75); **Ira de Zeus** (30% de rayo que mata a 3 zombies); **Rey Midas** (+100 puntos por baja power-up cada 20); **Gatillo infinito** (Nunca gastas balas arma nueva cada 45s); **Hora bruja** (Cada 3 min, 10 s de zombies a camara lenta).

## Daño de cada carta de daño, porcentaje a porcentaje

Daño base de 4 armas de Pueblo (archivo de arma, a corta distancia, al cuerpo): Galil 150 (cabeza ×4), M14 105 (cabeza ×3), Five-seven 160 (cabeza ×3.5), DSR 50 800 (cabeza ×10). 
Columna «Galil r10/r20/r30»: balas de Galil al cuerpo para matar un zombie normal de esa ronda (r10 = 1387, r20 = 4699, r30 = 15943) con sólo esa carta activa, sin clase ni otras cartas.

Cada fila es el % acumulado de **esa** carta (coges varias hasta llegar a él). Recuerda que los % de todas las cartas se suman antes de multiplicar.

### Calibre (siempre): valores +5% / +7% / +10% / +14% / +22%, tope +300%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |
| +300% | ×4.00 | 600 | 420 | 640 | 3200 | 3 | 8 | 27 |

### Gatillo loco (siempre; x2 con Double Tap comprado): valores +2% / +4% / +6% / +10% / +14%, tope +150%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |

### Ojo de halcon (tiro a la cabeza): valores +8% / +12% / +20% / +32% / +48%, tope +400%

| % | mult | Galil (cabeza) | M14 (cabeza) | Five-seven (cabeza) | DSR 50 (cabeza) | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 630 | 330 | 588 | 8400 | 9 | 30 | 102 |
| +10% | ×1.10 | 660 | 346 | 616 | 8800 | 9 | 29 | 97 |
| +20% | ×1.20 | 720 | 378 | 672 | 9600 | 8 | 27 | 89 |
| +30% | ×1.30 | 780 | 409 | 728 | 10400 | 8 | 25 | 82 |
| +40% | ×1.40 | 840 | 441 | 784 | 11200 | 7 | 23 | 76 |
| +60% | ×1.60 | 960 | 504 | 896 | 12800 | 6 | 20 | 67 |
| +80% | ×1.80 | 1080 | 567 | 1008 | 14400 | 6 | 18 | 60 |
| +100% | ×2.00 | 1200 | 630 | 1120 | 16000 | 5 | 16 | 54 |
| +150% | ×2.50 | 1500 | 787 | 1400 | 20000 | 4 | 13 | 43 |
| +200% | ×3.00 | 1800 | 945 | 1680 | 24000 | 4 | 11 | 36 |
| +300% | ×4.00 | 2400 | 1260 | 2240 | 32000 | 3 | 8 | 27 |
| +400% | ×5.00 | 3000 | 1575 | 2800 | 40000 | 2 | 7 | 22 |

### Nudillos de hierro (cuchillo): valores +40% / +65% / +95% / +145% / +240%, tope +3000%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |
| +300% | ×4.00 | 600 | 420 | 640 | 3200 | 3 | 8 | 27 |
| +400% | ×5.00 | 750 | 525 | 800 | 4000 | 2 | 7 | 22 |
| +3000% | ×31.00 | 4650 | 3255 | 4960 | 24800 | 1 | 2 | 4 |

### Polvora (explosiones): valores +8% / +12% / +20% / +32% / +48%, tope +400%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |
| +300% | ×4.00 | 600 | 420 | 640 | 3200 | 3 | 8 | 27 |
| +400% | ×5.00 | 750 | 525 | 800 | 4000 | 2 | 7 | 22 |

### Adrenalina (menos de media vida): valores +6% / +10% / +14% / +20% / +32%, tope +200%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |

### Punteria (apuntando): valores +4% / +6% / +10% / +14% / +20%, tope +100%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |

### Ultimas balas (cargador por debajo del 30%): valores +8% / +12% / +18% / +24% / +36%, tope +200%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |

### Cazatanques (contra tanques): valores +12% / +20% / +32% / +48% / +72%, tope +400%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |
| +300% | ×4.00 | 600 | 420 | 640 | 3200 | 3 | 8 | 27 |
| +400% | ×5.00 | 750 | 525 | 800 | 4000 | 2 | 7 | 22 |

### Combo (por baja seguida (hasta x10: el % de la tabla es carta x bajas)): valores +1% / +2% / +2% / +3% / +5%, tope +20% por stack

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |

### Furia (por golpe recibido 5 s (hasta x3)): valores +5% / +8% / +11% / +15% / +22%, tope +60% por stack

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +180% | ×2.80 | 420 | 294 | 448 | 2240 | 4 | 12 | 38 |

### Pulso firme (2 s sin disparar): valores +15% / +22% / +32% / +45% / +65%, tope +200%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |

### Tambor caliente (tras 1 s disparando seguido): valores +8% / +12% / +18% / +25% / +36%, tope +150%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |

### Plomo (balas seguidas sin recargar (1% por bala hasta el tope)): valores 10% / 15% / 20% / 30% / 40%, tope 100%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |

### Sangre fria (sin zombies a 4 m): valores +6% / +10% / +14% / +20% / +30%, tope +100%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |

### Madrugador (primeros 30 s de ronda): valores +8% / +12% / +18% / +25% / +36%, tope +100%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |

### Interes compuesto (1% por cada 1000 puntos hasta el tope): valores 10% / 15% / 20% / 25% / 35%, tope 50%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +50% | ×1.50 | 225 | 157 | 240 | 1200 | 7 | 21 | 71 |

### Mecha corta (granadas): valores +20% / +30% / +45% / +65% / +90%, tope +300%

| % | mult | Galil | M14 | Five-seven | DSR 50 | Galil r10 | Galil r20 | Galil r30 |
|---|---|---|---|---|---|---|---|---|
| +5% | ×1.05 | 157 | 110 | 168 | 840 | 9 | 30 | 102 |
| +10% | ×1.10 | 165 | 115 | 176 | 880 | 9 | 29 | 97 |
| +20% | ×1.20 | 180 | 126 | 192 | 960 | 8 | 27 | 89 |
| +30% | ×1.30 | 195 | 136 | 208 | 1040 | 8 | 25 | 82 |
| +40% | ×1.40 | 210 | 147 | 224 | 1120 | 7 | 23 | 76 |
| +60% | ×1.60 | 240 | 168 | 256 | 1280 | 6 | 20 | 67 |
| +80% | ×1.80 | 270 | 189 | 288 | 1440 | 6 | 18 | 60 |
| +100% | ×2.00 | 300 | 210 | 320 | 1600 | 5 | 16 | 54 |
| +150% | ×2.50 | 375 | 262 | 400 | 2000 | 4 | 13 | 43 |
| +200% | ×3.00 | 450 | 315 | 480 | 2400 | 4 | 11 | 36 |
| +300% | ×4.00 | 600 | 420 | 640 | 3200 | 3 | 8 | 27 |

### Factores (se aplican después de la suma)

| Factor | Cuándo | Efecto |
|---|---|---|
| Golpe crítico | 2% / 4% / 6% / 10% / 14% de probabilidad por disparo (tope 60%) | ×2.5 |
| Cazador de élites (firma) | cabeza a tanque o jefe | ×3 |
| Coloso (firma) | cuchillo estando quieto | ×3 |
| Cuerpo de cristal (mítica) | siempre | ×3 (recibes ×1.75) |
| Bomberman (mítica) | explosiones | ×1.5 (recibes ×2) |
| Último aliento | 3 s / 4 s / 5 s / 6 s / 8 s s tras bajar del 25 %, 1 vez por ronda | +100 % (se suma con los demás %) |
| Una bala basta | cabeza a más de 15 m con el zombie por debajo del 25% / 35% / 45% / 60% / 80% de vida | mata |
| Tiro de suerte de Escopetas | 15 % por perdigón, 35 % con francotirador | mata (jefe ×3) |

## Efectos que parten de un % de la vida del zombie

Daño base, antes de multiplicarlo por tus cartas de daño (ver la fórmula de arriba).

| Efecto | % vida | Nota | r10 | r20 | r30 | r40 | r50 |
|---|---|---|---|---|---|---|---|
| Fósforo / Pirotécnico / Alfa: fuego, por segundo | 4 % | 6 tics, uno por segundo (total 24 %); cada prendida vuelve a dar 6; jefe un cuarto | 55 | 187 | 637 | 2164 | 7346 |
| Pararrayos: rayo | 15 % | a 1 zombie (3 con Tesla) | 208 | 704 | 2391 | 8116 | 27551 |
| Sobrecarga: rayo | 25 % | al recargar, al más cercano; 100 % o más mata | 346 | 1174 | 3985 | 13527 | 45918 |
| Sobrecarga: rayo | 35 % | al recargar, al más cercano; 100 % o más mata | 485 | 1644 | 5580 | 18938 | 64285 |
| Sobrecarga: rayo | 50 % | al recargar, al más cercano; 100 % o más mata | 693 | 2349 | 7971 | 27055 | 91837 |
| Sobrecarga: rayo | 70 % | al recargar, al más cercano; 100 % o más mata | 970 | 3289 | 11160 | 37877 | 128571 |
| Sobrecarga: rayo | 100 % | al recargar, al más cercano; 100 % o más mata | 1387 | 4699 | 15943 | 54111 | 183674 |
| Sobrecarga: rayo | 200 % | al recargar, al más cercano; 100 % o más mata | 2774 | 9398 | 31886 | 108222 | 367348 |
| Condensador: 3 rayos | 50 % | tras 10 bajas sin recibir daño | 693 | 2349 | 7971 | 27055 | 91837 |
| Condensador: 3 rayos | 70 % | tras 10 bajas sin recibir daño | 970 | 3289 | 11160 | 37877 | 128571 |
| Condensador: 3 rayos | 100 % | tras 10 bajas sin recibir daño | 1387 | 4699 | 15943 | 54111 | 183674 |
| Condensador: 3 rayos | 140 % | tras 10 bajas sin recibir daño | 1941 | 6578 | 22320 | 75755 | 257143 |
| Condensador: 3 rayos | 200 % | tras 10 bajas sin recibir daño | 2774 | 9398 | 31886 | 108222 | 367348 |
| Condensador: 3 rayos | 300 % | tras 10 bajas sin recibir daño | 4161 | 14097 | 47829 | 162333 | 551022 |
| Tormenta: descarga | 12 % | cada 4.1 s a todos a 160 u | 166 | 563 | 1913 | 6493 | 22040 |
| Tormenta: descarga | 16 % | cada 4.0 s a todos a 160 u | 221 | 751 | 2550 | 8657 | 29387 |
| Tormenta: descarga | 22 % | cada 3.8 s a todos a 160 u | 305 | 1033 | 3507 | 11904 | 40408 |
| Tormenta: descarga | 30 % | cada 3.6 s a todos a 160 u | 416 | 1409 | 4782 | 16233 | 55102 |
| Tormenta: descarga | 42 % | cada 3.2 s a todos a 160 u | 582 | 1973 | 6696 | 22726 | 77143 |
| Tormenta: descarga | 90 % | cada 1.8 s a todos a 160 u | 1248 | 4229 | 14348 | 48699 | 165306 |
| Ciclón (firma): tocar esprintando | 25 % | cada 0.5 s por zombie | 346 | 1174 | 3985 | 13527 | 45918 |
| Espinas: al golpearte | 12 % | 100 % o más mata; Coloso quieto = 100 % | 166 | 563 | 1913 | 6493 | 22040 |
| Espinas: al golpearte | 20 % | 100 % o más mata; Coloso quieto = 100 % | 277 | 939 | 3188 | 10822 | 36734 |
| Espinas: al golpearte | 32 % | 100 % o más mata; Coloso quieto = 100 % | 443 | 1503 | 5101 | 17315 | 58775 |
| Espinas: al golpearte | 48 % | 100 % o más mata; Coloso quieto = 100 % | 665 | 2255 | 7652 | 25973 | 88163 |
| Espinas: al golpearte | 72 % | 100 % o más mata; Coloso quieto = 100 % | 998 | 3383 | 11478 | 38959 | 132245 |
| Espinas: al golpearte | 500 % | 100 % o más mata; Coloso quieto = 100 % | 6935 | 23495 | 79715 | 270555 | 918370 |
| Leaper: mordisco | fijo | 1000, o un tercio de la vida del zombie si es más; Collar +%; Alfa ×2 | 1000 | 1566 | 5314 | 18037 | 61224 |
| Reacción en cadena: explosión | fijo | 0.6 × vida de ronda + 100 a 160 u | 932 | 2919 | 9665 | 32566 | 110304 |

## Casos de ejemplo (todo al tope legendario)

Daño por bala calculado con la fórmula de arriba. «Balas» = balas para matar un zombie normal de esa ronda.

| Caso | Arma | Sumandos | mult | Daño | Balas r10 | Balas r20 | Balas r30 | Balas r50 |
|---|---|---|---|---|---|---|---|---|
| Francotirador quieto apuntando a la cabeza | DSR 50 cabeza | Calibre 22% + Ojo de halcon 48% + Punteria 20% + Pulso firme 65% | ×2.55 | 20400 | 1 | 1 | 1 | 10 |
| Francotirador, cabeza a un tanque con Cazador de élites | DSR 50 cabeza | Calibre 22% + Ojo de halcon 48% + Punteria 20% + Pulso firme 65% + Cazatanques 72% · ×3 | ×9.81 | 78480 | 1 | 1 | 1 | 3 |
| Gatillo (Automáticas con racha) en ráfaga larga | Galil | Calibre 22% + Gatillo loco (Double Tap comprado) 28% + Tambor 36% + Plomo 40% + Ultimas balas 36% | ×2.77 | 415 | 4 | 12 | 39 | 443 |
| Berserker con 3 golpes y menos de media vida | M14 | Calibre 22% + Adrenalina 32% + Furia x3 66% | ×2.20 | 231 | 7 | 21 | 70 | 796 |
| Berserker en Último aliento | M14 | Calibre 22% + Adrenalina 32% + Furia x3 66% + Ultimo aliento 100% | ×3.20 | 336 | 5 | 14 | 48 | 547 |
| Pistolas con Calibre y Sangre fría | Five-seven | Calibre 22% + Sangre fria 30% + Madrugador 36% | ×2.28 | 364 | 4 | 13 | 44 | 505 |
| Banquero con 35 000 puntos y 5 bebidas | Galil | Calibre 22% + Interes 35% + Plutocrata (5 bebidas) 30% | ×1.87 | 280 | 5 | 17 | 57 | 656 |
| Cuerpo de cristal + Calibre al tope | Galil | Calibre 300% · ×3 | ×12.00 | 1800 | 1 | 3 | 9 | 103 |

Combo (hasta +50 % con 10 bajas seguidas al tope) y Golpe crítico (×2.5) se suman o multiplican encima de cualquiera de estos casos.
