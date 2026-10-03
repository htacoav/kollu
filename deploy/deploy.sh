#!/usr/bin/env bash
# Despliega KOLLU en el VPS. Ejecutar en el servidor:
#   curl -fsSL https://raw.githubusercontent.com/htacoav/kollu/main/deploy/deploy.sh | sudo bash
# o, si ya está clonado:  sudo bash /opt/kollu/deploy/deploy.sh
set -euo pipefail

DOMAIN="${DOMAIN:-kollu.kamai.life}"
REPO="${REPO:-https://github.com/htacoav/kollu.git}"
DIR="${DIR:-/opt/kollu}"
BRANCH="${BRANCH:-main}"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  log "Instalando Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { echo "Falta el plugin 'docker compose'"; exit 1; }
command -v git >/dev/null 2>&1 || { log "Instalando git"; (apt-get update -y && apt-get install -y git) || yum install -y git; }

# 2. Código
if [ -d "$DIR/.git" ]; then
  log "Actualizando $DIR"
  git -C "$DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$DIR" reset --hard "origin/$BRANCH"
else
  log "Clonando $REPO en $DIR"
  git clone --depth 1 -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

# 3. ¿Quién ocupa los puertos 80/443?
busy() { ss -ltnH "( sport = :$1 )" 2>/dev/null | grep -q . ; }
ours() { docker ps --format '{{.Names}}' | grep -qx kollu-caddy; }

if ours || ! { busy 80 || busy 443; }; then
  log "Puertos libres: Caddy servirá https://$DOMAIN con certificado automático"
  DOMAIN="$DOMAIN" docker compose -f docker-compose.prod.yml --profile proxy up -d --build
elif command -v nginx >/dev/null 2>&1; then
  log "Hay un nginx en el VPS: lo uso como proxy hacia 127.0.0.1:8085"
  docker compose -f docker-compose.prod.yml up -d --build web
  CONF=/etc/nginx/sites-available/kollu
  [ -d /etc/nginx/sites-available ] || CONF=/etc/nginx/conf.d/kollu.conf
  cat > "$CONF" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 5m;
    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  [ -d /etc/nginx/sites-enabled ] && ln -sf "$CONF" /etc/nginx/sites-enabled/kollu
  nginx -t && systemctl reload nginx
  if ! command -v certbot >/dev/null 2>&1; then
    log "Instalando certbot"
    (apt-get update -y && apt-get install -y certbot python3-certbot-nginx) || true
  fi
  log "Pidiendo certificado HTTPS"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
    || echo "AVISO: certbot falló. Revisa que el DNS de $DOMAIN apunte a este servidor y vuelve a correr el script."
else
  docker compose -f docker-compose.prod.yml up -d --build web
  echo
  echo "AVISO: otro servicio usa los puertos 80/443 (¿Traefik u otro proxy?)."
  echo "KOLLU quedó corriendo en http://127.0.0.1:8085 — apunta tu proxy a esa dirección para $DOMAIN."
fi

log "Listo"
docker ps --filter name=kollu --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
echo "Prueba: curl -I https://$DOMAIN"
