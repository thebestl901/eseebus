# Build stage
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="eseebus"
LABEL org.opencontainers.image.description="九巴/城巴/專線小巴到站 PWA"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/origin-key.pem \
        -out /etc/nginx/ssl/origin.pem \
        -subj "/CN=eseebus.app" \
        -addext "subjectAltName=DNS:eseebus.app,DNS:www.eseebus.app"

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
