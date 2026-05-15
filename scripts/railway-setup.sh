#!/usr/bin/env bash
# Configure Railway environment variables for the komercia-mcp backend.
# Run this AFTER `railway init` and `railway link` have been completed.
#
# Usage:
#   bash scripts/railway-setup.sh
#
# Requirements:
#   - railway CLI installed and logged in
#   - Project linked in this directory (railway link)

set -euo pipefail

echo "Setting Railway environment variables for komercia-mcp..."

railway variables set \
  NODE_ENV=production \
  MCP_TRANSPORT=http \
  MCP_ALLOWED_ORIGINS="https://claude.ai,https://mcp.komercia.co" \
  RATE_LIMIT_MAX=10 \
  RATE_LIMIT_WINDOW_MS=60000 \
  KOMERCIA_NODE_URL=https://api.komercia.app \
  KOMERCIA_NODE_PUBLIC_KEY=c6979297-txfg-4962-7sag-709c76a71755 \
  KOMERCIA_LARAVEL_URL=https://api2.komercia.co \
  KOMERCIA_LARAVEL_CLIENT_ID=2 \
  KOMERCIA_EDITOR_URL=https://editor.komercia.app

echo ""
echo "✓ Non-secret variables set."
echo ""
echo "Now set the secrets individually (copy from 1Password / .env):"
echo ""
echo "  railway variables set DATABASE_URL='<neon-connection-string>'"
echo "  railway variables set JWT_SECRET='<64-hex-chars>'"
echo "  railway variables set KOMERCIA_SESSION_ENCRYPTION_KEY='<64-hex-chars>'"
echo "  railway variables set KOMERCIA_LARAVEL_CLIENT_SECRET='<secret>'"
echo ""
echo "Done. Deploy with: railway up --detach"
