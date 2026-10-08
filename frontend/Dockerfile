# ═════════════════════════════════════════════════════════
# Frontend — Node build + Nginx serve
# ═════════════════════════════════════════════════════════

# ─── Stage 1: Build React app ───
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Serve with Nginx ───
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config (uses port 80)
RUN rm -f /etc/nginx/conf.d/default.conf

# Write a startup script that generates nginx config with $PORT
RUN printf '#!/bin/sh\n\
PORT=${PORT:-8080}\n\
echo "Starting nginx on port $PORT"\n\
cat > /etc/nginx/conf.d/default.conf << EOF\n\
server {\n\
    listen $PORT;\n\
    listen [::]:$PORT;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files \\$uri \\$uri/ /index.html;\n\
    }\n\
    location /assets/ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n\
EOF\n\
exec nginx -g "daemon off;"\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
