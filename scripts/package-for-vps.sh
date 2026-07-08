#!/usr/bin/env bash
# 在本機 Mac 執行：打包專案供上傳 VPS（不含 node_modules / dist）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/eseebus-deploy.tar.gz"

cd "$ROOT"
tar -czf "$OUT" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='eseebus-deploy.tar.gz' \
  --exclude='.DS_Store' \
  .

echo "已建立：$OUT"
echo ""
echo "上傳至 VPS（將 YOUR_IP 換成公網 IP）："
echo "  scp $OUT root@YOUR_IP:/root/"
echo ""
echo "在 VPS 解壓並部署："
echo "  mkdir -p /opt/eseebus && tar -xzf /root/eseebus-deploy.tar.gz -C /opt/eseebus"
echo "  cd /opt/eseebus && chmod +x scripts/deploy-vps.sh && sudo ./scripts/deploy-vps.sh"
