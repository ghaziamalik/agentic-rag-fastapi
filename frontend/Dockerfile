# ═════════════════════════════════════════════════════════
# Frontend Dockerfile — Multi-stage build
# ═════════════════════════════════════════════════════════

# ─── Stage 1: Build ───
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ─── Stage 2: Serve with nginx ───
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Use a template that replaces ${PORT} at runtime
RUN echo 'server { \
    listen ${PORT}; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Default PORT if not set
ENV PORT=80

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
