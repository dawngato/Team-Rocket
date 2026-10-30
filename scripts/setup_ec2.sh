#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# HimVote EC2 Server Bootstrap & Deployment Setup Script
# Target Host: 13.232.47.32 (AWS EC2)
# ==============================================================================

echo "=== [1/5] Updating system packages ==="
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw htop

echo "=== [2/5] Installing Docker and Docker Compose ==="
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Ensure current user can run docker without sudo
sudo usermod -aG docker "$USER" || true

echo "=== [3/5] Configuring Firewall (UFW) ==="
sudo ufw allow 22/tcp comment 'SSH' || true
sudo ufw allow 80/tcp comment 'HTTP' || true
sudo ufw allow 443/tcp comment 'HTTPS' || true
sudo ufw allow 3000/tcp comment 'NextJS Web' || true
sudo ufw allow 8000/tcp comment 'API Gateway' || true
sudo ufw --force enable || true

echo "=== [4/5] Preparing HimVote App Directory ==="
APP_DIR="/opt/himvote"
sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER":"$USER" "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
    echo "Cloning repository..."
    git clone https://github.com/dawngato/Team-Rocket.git "$APP_DIR"
else
    echo "Pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin main
    git reset --hard origin/main
fi

cd "$APP_DIR"

echo "=== [5/5] Launching HimVote Containers ==="
if [ -f "compose.yaml" ]; then
    docker compose -f compose.yaml -f compose.dev.yaml up -d --build
    echo "Containers launched successfully!"
    docker compose ps
fi

echo "=============================================================================="
echo " HimVote EC2 Bootstrap Complete!"
echo " Public Access: http://13.232.47.32 (or port 3000 for Web, 8000 for API)"
echo " Note: Run 'newgrp docker' if running docker commands as current user."
echo "=============================================================================="
