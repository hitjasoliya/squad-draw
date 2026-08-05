#!/usr/bin/env bash
# EC2 setup for squad-draw (Ubuntu 24.04 LTS, c7i-flex.large, ap-south-1)
# Run ONCE over SSH after the instance is running:
#   ssh -i ~/.ssh/squad-draw.pem ubuntu@<INSTANCE_PUBLIC_IP>
#   bash ec2-setup.sh
set -euo pipefail

APP_DIR="$HOME/squad-draw"
GIT_REPO="https://github.com/hit-7624/squad-draw.git"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"

echo "==> Installing Docker + compose plugin"
sudo apt-get update -qq
sudo apt-get install -y -qq ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker

echo "==> Adding 2GB swap (OOM safety net)"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile > /dev/null
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
fi

echo "==> Cloning repo"
if [ ! -d "$APP_DIR" ]; then
  git clone "$GIT_REPO" "$APP_DIR"
else
  git -C "$APP_DIR" pull
fi

echo "==> Writing .env (JWT_SECRET generated; overwrites deploy/.env)"
cat > "$APP_DIR/deploy/.env" <<ENV
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=squad_draw
JWT_SECRET=${JWT_SECRET}
ENV
chmod 600 "$APP_DIR/deploy/.env"

echo "==> Building images (first build takes a few minutes)"
docker compose -f "$APP_DIR/deploy/docker-compose.yml" up -d --build

echo "==> Healthchecks"
for i in $(seq 1 30); do
  sleep 5
  WEB=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 || true)
  AUTH=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health || true)
  echo "attempt $i: web=$WEB auth=$AUTH"
  [ "$WEB" = "200" ] && [ "$AUTH" = "200" ] && break
done

echo "==> Done. Open http://<INSTANCE_PUBLIC_IP>:3000"
echo "Containers:"
docker compose -f "$APP_DIR/deploy/docker-compose.yml" ps
