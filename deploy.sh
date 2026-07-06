#!/bin/bash
# ─── JoyEvents — PM2 Deploy Script ────────────────────────────────────────────
#
# Run this script on the server after pulling the latest code:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# First-time setup:
#   1. Copy frontend/.env.example to frontend/.env and set VITE_API_URL
#   2. Copy backend/.env.example to backend/.env and set all secrets
#   3. Run this script
#   4. pm2 save && pm2 startup   (to survive reboots)

set -e  # exit on any error

echo "🚀 JoyEvents Deploy"
echo "====================="

# ── 0. Enforce Node.js v24+ ────────────────────────────────────────────────────
NODE_MAJOR=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
if [ "$NODE_MAJOR" -lt 24 ]; then
  echo ""
  echo "❌ ERROR: Node.js v24+ is required. You are running v$(node -v)."
  echo "   Install Node 24 via nvm:"
  echo "     nvm install 24"
  echo "     nvm use 24"
  echo "   Or download from: https://nodejs.org"
  exit 1
fi
echo "✅ Node.js $(node -v) — OK"

# ── 1. Install dependencies ────────────────────────────────────────────────────
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install --omit=dev
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install
cd ..

# ── 2. Build frontend ──────────────────────────────────────────────────────────
echo ""
echo "🔨 Building frontend..."
if [ ! -f "frontend/.env" ]; then
  echo "⚠️  WARNING: frontend/.env not found!"
  echo "   Copy frontend/.env.example to frontend/.env and set VITE_API_URL"
  echo "   The build will use the fallback (localhost:5001) which is WRONG in production."
fi
cd frontend && npm run build
cd ..

# ── 3. Start / restart PM2 processes ──────────────────────────────────────────
echo ""
echo "⚙️  Starting PM2 processes..."
if pm2 list | grep -q "joyevents-backend"; then
  echo "   Restarting existing PM2 processes..."
  pm2 restart ecosystem.config.cjs
else
  echo "   Starting PM2 processes for the first time..."
  pm2 start ecosystem.config.cjs
fi

echo ""
echo "✅ Deploy complete!"
echo "   Frontend : http://localhost:8080"
echo "   Backend  : http://localhost:5001"
echo ""
echo "💡 Run 'pm2 logs' to watch live logs"
echo "💡 Run 'pm2 save' to persist across reboots"
