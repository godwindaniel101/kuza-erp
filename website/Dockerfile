# Kuza marketing site — Next.js + React (same stack as the portal), built to a
# static export and served by nginx on :8080. Two-stage build.

# ---- build stage: compile the Next.js app to static HTML in /app/out ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ---- serve stage: nginx serves the static export ----
FROM nginx:alpine
# The whole site is now Next.js (public/ -> out/, hashed CSS/JS in out/_next).
COPY --from=build /app/out /usr/share/nginx/html
# Clean URLs (/restaurant -> restaurant.html) + gzip + caching.
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
