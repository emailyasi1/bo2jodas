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

function Subir-Archivo($archivo) {
    try {
        $json = Get-Content -Raw -Encoding UTF8 $archivo.FullName | ConvertFrom-Json
    } catch {
        Write-Host "$($archivo.Name): JSON ilegible ($($_.Exception.Message)); se reintentara" -ForegroundColor Yellow
        return $false
    }
    # Fecha de la partida: la del archivo (el juego no tiene reloj de pared).
    $json | Add-Member -NotePropertyName fecha -NotePropertyValue $archivo.LastWriteTimeUtc.ToString("o") -Force
    if ($nombre) { $json | Add-Member -NotePropertyName subido_por -NotePropertyValue $nombre -Force }
    $cuerpo = $json | ConvertTo-Json -Depth 20 -Compress
    $cabeceras = @{ "content-type" = "application/json" }
    if ($token) { $cabeceras["x-token"] = $token }
    try {
        $r = Invoke-RestMethod -Method Post -Uri "$url/api/runs" -Headers $cabeceras -Body ([System.Text.Encoding]::UTF8.GetBytes($cuerpo)) -TimeoutSec 30
        if ($r.repetida) { Write-Host "$($archivo.Name): ya estaba en la web" } else { Write-Host "$($archivo.Name): subida ($url/partida/$($r.id))" -ForegroundColor Green }
        Add-Content -Path $registro -Value $archivo.Name
        return $true
    } catch {
        # 422: la web la filtra (nadie paso del nivel 10). Se apunta para no reintentarla.
        $codigo = $null
        if ($_.Exception.Response) { $codigo = [int]$_.Exception.Response.StatusCode }
        if ($codigo -eq 422) {
            Write-Host "$($archivo.Name): no se sube (nadie paso del nivel 10, se filtra como reset)" -ForegroundColor Yellow
            Add-Content -Path $registro -Value $archivo.Name
            return $true
        }
        Write-Host "$($archivo.Name): error al subir: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Revisar {
    if (-not (Test-Path $carpeta)) { return }
    $subidas = Get-Content $registro
    foreach ($f in Get-ChildItem -Path $carpeta -Filter *.json | Sort-Object LastWriteTime) {
        if ($subidas -contains $f.Name) { continue }
        # Esperar a que el juego termine de escribirlo.
        if (((Get-Date) - $f.LastWriteTime).TotalSeconds -lt 3) { continue }
        Subir-Archivo $f | Out-Null
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
