#!/usr/bin/env bash
#
# SalonBot — First-time VPS setup for Hetzner (Ubuntu 22.04/24.04)
#
# Usage:
#   scp scripts/init-server.sh user@your-vps-ip:~
#   ssh user@your-vps-ip
#   chmod +x init-server.sh
#   ./init-server.sh yourdomain.com your@email.com https://github.com/you/salonbot.git
#
set -euo pipefail

DOMAIN="${1:?Usage: $0 <domain> <email> <git-repo-url>}"
EMAIL="${2:?Usage: $0 <domain> <email> <git-repo-url>}"
REPO="${3:?Usage: $0 <domain> <email> <git-repo-url>}"
APP_DIR="$HOME/salonbot"

echo "==> Setting up SalonBot on ${DOMAIN}"

# ── 1. System updates + firewall ────────────────────────
echo "==> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# ── 2. Install Docker ───────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "==> Docker installed. You may need to log out and back in for group changes."
else
  echo "==> Docker already installed, skipping."
fi

# Ensure docker compose plugin is available
if ! docker compose version &>/dev/null; then
  echo "ERROR: docker compose plugin not found. Re-login and retry."
  exit 1
fi

# ── 3. Clone repository ────────────────────────────────
if [ -d "$APP_DIR" ]; then
  echo "==> $APP_DIR exists, pulling latest..."
  cd "$APP_DIR" && git pull
else
  echo "==> Cloning repository..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 4. Create .env from example ─────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  sed -i "s|NODE_ENV=development|NODE_ENV=production|" "$APP_DIR/.env"
  sed -i "s|MONGODB_URI=mongodb://localhost:27017/salonbot|MONGODB_URI=mongodb://mongo:27017/salonbot|" "$APP_DIR/.env"
  sed -i "s|BASE_URL=https://yourdomain.com|BASE_URL=https://${DOMAIN}|" "$APP_DIR/.env"
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  .env created — you MUST edit it with real secrets:     ║"
  echo "║    nano $APP_DIR/.env                                   ║"
  echo "║                                                         ║"
  echo "║  Required: JWT_SECRET, OPENAI_API_KEY                   ║"
  echo "║  Optional: WHATSAPP_*, RAZORPAY_*                       ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  read -rp "Press Enter after editing .env (or Ctrl+C to abort)..."
fi

# ── 5. Patch nginx config with domain ───────────────────
echo "==> Patching nginx config with domain: ${DOMAIN}"
sed -i "s/yourdomain.com/${DOMAIN}/g" "$APP_DIR/nginx/conf.d/salonbot.conf"

# ── 6. SSL bootstrap (two-phase) ────────────────────────
# Phase A: Start with HTTP-only nginx to serve ACME challenge
echo "==> Phase A: Starting HTTP-only nginx for SSL certificate..."

# Create temporary HTTP-only nginx config
cat > "$APP_DIR/nginx/conf.d/salonbot-temp.conf" <<NGINX_TEMP
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP

# Temporarily swap configs
mv "$APP_DIR/nginx/conf.d/salonbot.conf" "$APP_DIR/nginx/conf.d/salonbot.conf.bak"
docker compose up -d mongo nginx

echo "==> Waiting for nginx to start..."
sleep 5

# Phase B: Get SSL certificate
echo "==> Requesting SSL certificate from Let's Encrypt..."
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

# Restore full config with HTTPS
mv "$APP_DIR/nginx/conf.d/salonbot.conf.bak" "$APP_DIR/nginx/conf.d/salonbot.conf"
rm -f "$APP_DIR/nginx/conf.d/salonbot-temp.conf"

# ── 7. Start everything ────────────────────────────────
echo "==> Starting all services..."
docker compose up -d --build

echo "==> Waiting for app to be healthy..."
sleep 15

# ── 8. Verify ───────────────────────────────────────────
echo "==> Checking health endpoint..."
if curl -sf "https://${DOMAIN}/health" | grep -q '"status":"ok"'; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║  SalonBot is live!                                      ║"
  echo "║                                                         ║"
  echo "║  Dashboard: https://${DOMAIN}                           ║"
  echo "║  API:       https://${DOMAIN}/api                       ║"
  echo "║  Health:    https://${DOMAIN}/health                    ║"
  echo "║  Webhook:   https://${DOMAIN}/webhook                   ║"
  echo "╚══════════════════════════════════════════════════════════╝"
else
  echo ""
  echo "WARNING: Health check did not return 'ok'."
  echo "Check logs with: docker compose logs app"
fi

echo ""
echo "Useful commands:"
echo "  docker compose logs -f app     # App logs"
echo "  docker compose logs -f nginx   # Nginx logs"
echo "  docker compose ps              # Service status"
echo "  docker compose restart app     # Restart app"
