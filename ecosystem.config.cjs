// PM2 Ecosystem Config — separate frontend + backend deployment
//
// Usage:
//   pm2 start ecosystem.config.cjs          # start both
//   pm2 restart ecosystem.config.cjs        # restart both
//   pm2 stop ecosystem.config.cjs           # stop both
//   pm2 delete ecosystem.config.cjs         # remove from PM2
//   pm2 save                                # persist across reboots
//   pm2 startup                             # generate startup script
//
// Before first deploy:
//   1. cd frontend && npm install && npm run build
//   2. cd ../backend && npm install
//   3. pm2 start ecosystem.config.cjs
//
// After code updates:
//   cd frontend && npm run build && pm2 restart joyevents-frontend
//   pm2 restart joyevents-backend

module.exports = {
  apps: [
    // ── Backend API (Node/Express) ──────────────────────────────────────────
    {
      name: "joyevents-backend",
      cwd: "./backend",
      script: "src/index.js",
      interpreter: "node",
      // Pass --experimental-vm-modules if needed; ESM is handled by "type":"module"
      node_args: "",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 5001,
      },
      // PM2 will load backend/.env automatically via dotenv inside the app.
      // You can also set env vars here to override .env values:
      // env: {
      //   NODE_ENV: "production",
      //   PORT: 5001,
      //   MONGO_URI: "...",
      //   JWT_SECRET: "...",
      //   FRONTEND_URL: "https://yourdomain.com",
      //   ALLOWED_ORIGINS: "https://yourdomain.com",
      // },
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
    },

    // ── Frontend (static SPA served by `serve`) ─────────────────────────────
    // `serve -s dist` serves the Vite build with SPA fallback (all 404s → index.html)
    // so React Router works correctly on page refresh.
    {
      name: "joyevents-frontend",
      cwd: "./frontend",
      script: "node_modules/.bin/serve",
      args: "-s dist -l 8080",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/frontend-error.log",
      out_file: "./logs/frontend-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_restarts: 10,
      restart_delay: 3000,
      autorestart: true,
    },
  ],
};
