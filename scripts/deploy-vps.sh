#!/usr/bin/env bash
# 在 VPS 上執行：於專案根目錄一鍵 Docker 部署
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

PORT="${PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"

echo "==> 檢查 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "未安裝 Docker，正在安裝（Ubuntu/Debian）..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "請安裝 Docker Compose 插件後再試"
  exit 1
fi

echo "==> 建置並啟動（HTTP ${PORT} / HTTPS ${HTTPS_PORT}）..."
export PORT HTTPS_PORT
if groups | grep -q docker; then
  $COMPOSE down 2>/dev/null || true
  $COMPOSE up -d --build
else
  sudo $COMPOSE down 2>/dev/null || true
  sudo $COMPOSE up -d --build
fi

echo ""
echo "==> 部署完成"
echo "    本機：http://127.0.0.1:${PORT}"
echo "    健康：http://127.0.0.1:${PORT}/health"
echo ""
echo "請在騰訊雲防火牆／安全組放行 TCP ${PORT} 與 ${HTTPS_PORT}"
echo "外網：http://<你的公網IP>:${PORT} 或 https://eseebus.app"
echo ""
echo "常用指令："
echo "  查看日誌：$COMPOSE logs -f"
echo "  重新部署：$COMPOSE up -d --build"
echo "  停止：    $COMPOSE down"
