FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# No VITE_API_URL — frontend uses relative /api paths.
# Nginx (nginx-lb.conf) proxies /api/* to the backend pool.
RUN npm run build

# ── Serve built assets with Nginx ────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
