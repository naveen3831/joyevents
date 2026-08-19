# Performance Optimization & Deployment Notes

## SPA Routing Fix (Resolving 404 Error on Refresh)

### Root Cause
React applications use client-side routing (`react-router-dom`). When refreshing pages like `/my-requests` or `/admin-dashboard`, the browser sends an HTTP request directly to Nginx for that path. Since `/my-requests` is a client-side route (not a physical file on the server), Nginx returns a `404 Not Found` error.

---

### Solution 1: Update Nginx Configuration (Recommended)
Add `try_files $uri $uri/ /index.html;` to your Nginx site configuration file (located at `/etc/nginx/sites-available/default` or `/etc/nginx/sites-available/joyevents`):

```nginx
server {
    listen 80;
    server_name joyevents.speshway.site;

    root /var/www/joyevents/frontend/dist;
    index index.html;

    # SPA Fallback: Directs all client routes back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to Express Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket Realtime Updates
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

After updating Nginx config on the server, reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

### Solution 2: If using PM2 `serve` reverse proxy:
If Nginx proxies to PM2 serving the frontend on port 8080 (via `ecosystem.config.cjs`), ensure Nginx proxies root requests to port 8080:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```
The PM2 script `serve` runs with `-s dist` (Single Page Application mode), which automatically handles fallback to `index.html`.
