# Sube a la web las partidas que deja el mod bo2jodas. Lo ejecuta el ANFITRION
# (su juego es el que escribe los JSON). Vigila la carpeta scriptdata del mod y
# sube cada archivo nuevo; apunta los subidos en subidas.txt para no repetir.
#
# Configuracion: edita subir_partidas.cfg (al lado de este archivo):
#   url=https://1.2.3.4.sslip.io
#   token=el_token_del_servidor
#   nombre=tu nombre (opcional, para saber quien hospedo la partida)
#
# Uso: doble clic en subir_partidas.bat (se queda abierto vigilando) o
#      powershell -ExecutionPolicy Bypass -File subir_partidas.ps1 -UnaVez

param([switch]$UnaVez)

$aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$cfgRuta = Join-Path $aqui "subir_partidas.cfg"
if (-not (Test-Path $cfgRuta)) {
    Write-Host "Falta subir_partidas.cfg (copia subir_partidas.cfg.ejemplo y pon la url)." -ForegroundColor Red
    exit 1
}
$cfg = @{}
Get-Content $cfgRuta | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*?)\s*$') { $cfg[$matches[1]] = $matches[2] }
}
$url = $cfg["url"].TrimEnd("/")
$token = $cfg["token"]
$nombre = $cfg["nombre"]
if (-not $url) { Write-Host "La url esta vacia en subir_partidas.cfg" -ForegroundColor Red; exit 1 }

$carpeta = Join-Path $env:LOCALAPPDATA "Plutonium\storage\t6\mods\zm_bo2jodas\scriptdata\bo2jodas_partidas"
$registro = Join-Path $aqui "subidas.txt"
if (-not (Test-Path $registro)) { New-Item -ItemType File -Path $registro | Out-Null }

# Desde la 1.10.3 el mod guarda el JSON al acabar cada ronda con "terminada":0
# (para no perder la partida si alguien hace map_restart o fast_restart) y lo
# reescribe con "terminada":1 al acabar. Las terminadas se suben al momento.
# Una sin terminar solo se sube cuando su partida ya no esta viva, segun el
# latido en_partida.txt que el mod (1.10.5) escribe cada minuto con el id y el
# estado: si el latido es de otra partida (reinicio) o dice "acabada" se sube
# ya; si lleva SIN_TERMINAR_MIN minutos parado (juego cerrado) tambien; si no,
# se espera, dure lo que dure la ronda. Sin latido, SIN_TERMINAR_MIN minutos
# sin cambiar el JSON. Se apunta con su fecha: si luego cambia, se vuelve a
# subir y la web sustituye la version sin terminar.
$SIN_TERMINAR_MIN = 40
$latido = Join-Path $carpeta "en_partida.txt"

function Partida-Muerta($json, $archivo) {
    $minutos = ((Get-Date) - $archivo.LastWriteTime).TotalMinutes
    if (-not (Test-Path $latido)) { return ($minutos -ge $SIN_TERMINAR_MIN) }
    $l = Get-Item $latido
    try {
        $lat = Get-Content -Raw -Encoding UTF8 $l.FullName | ConvertFrom-Json
    } catch {
        return $false   # a medias de escribirse: la partida sigue
    }
    if ("$($lat.id)" -ne "$($json.id)") { return $true }
    if ($lat.estado -eq "acabada") { return $true }
    return (((Get-Date) - $l.LastWriteTime).TotalMinutes -ge $SIN_TERMINAR_MIN)
}

# Si la web pide esperar (429, demasiadas subidas), no se vuelve a intentar
# nada hasta la hora que diga.
$script:esperarHasta = Get-Date

function Subir-Archivo($archivo, $clave) {
    $minutos = ((Get-Date) - $archivo.LastWriteTime).TotalMinutes
    try {
        $json = Get-Content -Raw -Encoding UTF8 $archivo.FullName | ConvertFrom-Json
    } catch {
        # Si el juego se cerro a mitad de escribirlo, no se arreglara solo.
        if ($minutos -ge $SIN_TERMINAR_MIN) {
            Write-Host "$($archivo.Name): JSON ilegible y sin cambios desde hace rato; se ignora" -ForegroundColor Yellow
            Add-Content -Path $registro -Value $clave
            return $true
        }
        Write-Host "$($archivo.Name): JSON ilegible ($($_.Exception.Message)); se reintentara" -ForegroundColor Yellow
        return $false
    }
    $terminada = ($null -eq $json.terminada) -or ($json.terminada -eq 1)
    if (-not $terminada -and -not (Partida-Muerta $json $archivo)) { return $false }
    if (-not $terminada) { $clave = "$($archivo.Name)@$($archivo.LastWriteTimeUtc.Ticks)" }
    # Fecha de la partida: la del archivo (el juego no tiene reloj de pared).
    $json | Add-Member -NotePropertyName fecha -NotePropertyValue $archivo.LastWriteTimeUtc.ToString("o") -Force
    if ($nombre) { $json | Add-Member -NotePropertyName subido_por -NotePropertyValue $nombre -Force }
    $cuerpo = $json | ConvertTo-Json -Depth 20 -Compress
    $cabeceras = @{ "content-type" = "application/json" }
    if ($token) { $cabeceras["x-token"] = $token }
    try {
        $r = Invoke-RestMethod -Method Post -Uri "$url/api/runs" -Headers $cabeceras -Body ([System.Text.Encoding]::UTF8.GetBytes($cuerpo)) -TimeoutSec 90
        if ($r.repetida) { Write-Host "$($archivo.Name): ya estaba en la web" } else { Write-Host "$($archivo.Name): subida ($url/partida/$($r.id))" -ForegroundColor Green }
        Add-Content -Path $registro -Value $clave
        return $true
    } catch {
        $codigo = $null
        $resp = $_.Exception.Response
        if ($resp) { $codigo = [int]$resp.StatusCode }
        $motivo = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
            try { $motivo = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch { }
        }
        # 429: demasiadas subidas. Se espera lo que diga la web y se para la pasada.
        if ($codigo -eq 429) {
            $segundos = 600
            try { $segundos = [int]$resp.Headers["Retry-After"] } catch { }
            if ($segundos -lt 30) { $segundos = 30 }
            $script:esperarHasta = (Get-Date).AddSeconds($segundos)
            Write-Host "La web pide esperar: $motivo. Se reintenta a las $($script:esperarHasta.ToString('HH:mm'))." -ForegroundColor Yellow
            return $false
        }
        # 401: token mal. Hay que arreglarlo en subir_partidas.cfg; se para un rato.
        if ($codigo -eq 401) {
            $script:esperarHasta = (Get-Date).AddMinutes(10)
            Write-Host "Token incorrecto: copia el de tu perfil en subir_partidas.cfg. Se reintenta en 10 min." -ForegroundColor Red
            return $false
        }
        # Otro 4xx (422: los datos no cuadran, formato viejo, archivo grande...):
        # no se va a arreglar solo. Se apunta para no reintentarlo.
        if ($codigo -ge 400 -and $codigo -lt 500) {
            Write-Host "$($archivo.Name): la web no la acepta ($motivo); no se reintenta" -ForegroundColor Yellow
            Add-Content -Path $registro -Value $clave
            return $true
        }
        # Sin respuesta o 5xx (web dormida o caida): un minuto de espera.
        $script:esperarHasta = (Get-Date).AddMinutes(1)
        Write-Host "$($archivo.Name): no se pudo subir ($motivo); se reintenta en un minuto" -ForegroundColor Red
        return $false
    }
}

function Revisar {
    if (-not (Test-Path $carpeta)) { return }
    if ((Get-Date) -lt $script:esperarHasta) { return }
    $subidas = Get-Content $registro
    foreach ($f in Get-ChildItem -Path $carpeta -Filter *.json | Sort-Object LastWriteTime) {
        if ($subidas -contains $f.Name) { continue }
        if ($subidas -contains "$($f.Name)@$($f.LastWriteTimeUtc.Ticks)") { continue }
        # Esperar a que el juego termine de escribirlo.
        if (((Get-Date) - $f.LastWriteTime).TotalSeconds -lt 3) { continue }
        Subir-Archivo $f $f.Name | Out-Null
        if ((Get-Date) -lt $script:esperarHasta) { return }
    }
}

Write-Host "bo2jodas: vigilando $carpeta"
Write-Host "          subiendo a $url"
Revisar
if ($UnaVez) { exit 0 }
while ($true) {
    Start-Sleep -Seconds 10
    Revisar
}
