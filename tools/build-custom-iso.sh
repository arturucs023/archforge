#!/bin/bash
# Construye la ISO personalizada de ArchForge: la base + paquetes extra DENTRO.
#
# Donde se ejecuta: CI (ubuntu-latest), despues de `npm run setup:vm-web`
# (que ya dejo public/vm/alpine.iso, BIOS y wasm). En local requiere Linux
# con xorriso; en Windows se salta (el dev usa la ISO base).
#
# Garantia: si CUALQUIER paso falla, se deja la ISO base intacta y el deploy
# sigue. Una ISO rota seria peor que una sin paquetes extra.
#
# Uso: bash tools/build-custom-iso.sh
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VM="$ROOT/public/vm"
ISO="$VM/alpine.iso"
STAGE="$VM/extra-pkgs"
WORK="${RUNNER_TEMP:-/tmp}/archforge-iso"

fail_soft() {
  echo "AVISO build-custom-iso: $1 — se sigue con la ISO base"
  exit 0
}

[ -f "$ISO" ] || fail_soft "no existe $ISO (setup-vm-web no corrio?)"
command -v xorriso >/dev/null 2>&1 || {
  echo "instalando xorriso..."
  sudo apt-get update -qq >/dev/null 2>&1
  sudo apt-get install -y -q xorriso isolinux syslinux-common >/dev/null 2>&1 \
    || fail_soft "no se pudo instalar xorriso"
}

rm -rf "$WORK"
mkdir -p "$WORK/root" "$WORK/idx"
echo "--- extrayendo indice de la ISO base ---"
xorriso -osirrox on -indev "$ISO" \
  -extract /apks/x86/APKINDEX.tar.gz "$WORK/idx-APKINDEX.tar.gz" \
  >/dev/null 2>&1 || fail_soft "no se pudo leer el indice de la ISO"

echo "--- resolviendo paquetes extra ---"
node "$ROOT/tools/resolve-vm-pkgs.mjs" --iso-index "$WORK/idx-APKINDEX.tar.gz" \
  || fail_soft "fallo la resolucion de paquetes"
[ -n "$(ls "$STAGE"/*.apk 2>/dev/null)" ] || fail_soft "no se descargo ningun .apk"

echo "--- extrayendo ISO base ---"
xorriso -osirrox on -indev "$ISO" -extract / "$WORK/root" >/dev/null 2>&1 \
  || fail_soft "no se pudo extraer la ISO"

echo "--- inyectando paquetes en /extra-pkgs/ ---"
mkdir -p "$WORK/root/extra-pkgs"
cp "$STAGE"/*.apk "$WORK/root/extra-pkgs/"
cp "$STAGE/extra-pkgs.json" "$WORK/root/extra-pkgs/extra-pkgs.json"
echo "inyectados: $(ls "$WORK/root/extra-pkgs"/*.apk | wc -l) .apk"

echo "--- reconstruyendo ISO hibrida (flags de la original) ---"
cp "$ISO" "$WORK/orig.iso"
ALPINE_VER="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$VM/manifest.json','utf8')).alpine || '3.24.2')")"
xorriso -as mkisofs \
  -V "archforge-alpine $ALPINE_VER x86" \
  --modification-date='2026091717321200' \
  -isohybrid-mbr --interval:local_fs:0s-15s:zero_mbrpt,zero_gpt:"$WORK/orig.iso" \
  -partition_cyl_align on \
  -partition_offset 0 \
  -partition_hd_cyl 64 \
  -partition_sec_hd 32 \
  --mbr-force-bootable \
  -iso_mbr_part_type 0x00 \
  -c '/boot/syslinux/boot.cat' \
  -b '/boot/syslinux/isolinux.bin' \
  -no-emul-boot -boot-load-size 4 -boot-info-table \
  -eltorito-alt-boot \
  -e '/boot/grub/efi.img' \
  -no-emul-boot -boot-load-size 2880 \
  -isohybrid-gpt-basdat \
  -o "$WORK/alpine-custom.iso" \
  "$WORK/root" >/dev/null 2>&1 || fail_soft "xorriso no pudo reconstruir"

SIZE=$(stat -c%s "$WORK/alpine-custom.iso")
[ "$SIZE" -gt 50000000 ] || fail_soft "la ISO resultante es sospechosamente pequena ($SIZE bytes)"
echo "--- verificando arranque El Torito ---"
xorriso -indev "$WORK/alpine-custom.iso" -report_el_torito as_mkisofs 2>/dev/null \
  | grep -q "isolinux.bin" || fail_soft "la ISO no tiene arranque BIOS"
N=$(xorriso -indev "$WORK/alpine-custom.iso" -find /extra-pkgs -maxdepth 1 2>/dev/null | grep -c apk)
[ "$N" -gt 0 ] || fail_soft "extra-pkgs vacio en la ISO resultante"

mv "$WORK/alpine-custom.iso" "$ISO"
echo "--- actualizando manifiesto ---"
node -e "
const fs = require('fs');
const m = JSON.parse(fs.readFileSync('$VM/manifest.json', 'utf8'));
const e = JSON.parse(fs.readFileSync('$STAGE/extra-pkgs.json', 'utf8'));
m.isoBytes = fs.statSync('$ISO').size;
m.custom = true;
m.packages = e.files;
m.wanted = e.wanted;
fs.writeFileSync('$VM/manifest.json', JSON.stringify(m, null, 2));
console.log('manifiesto:', JSON.stringify(m));
"
# Los .apk ya estan DENTRO de la ISO: no se despliegan sueltos para no
# duplicar ~19 MB en el sitio.
rm -rf "$STAGE"
echo "LISTO: ISO personalizada de $(du -h "$ISO" | cut -f1)"
