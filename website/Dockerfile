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
# Next.js homepage + assets (public/ -> out/, hashed CSS/JS in out/_next).
COPY --from=build /app/out /usr/share/nginx/html
# Bridge: sub-pages not yet ported to Next (restaurant, shop, ...) + their shared
# stylesheet. Removed page-by-page as each is rebuilt in React.
COPY --from=build /app/legacy/ /usr/share/nginx/html/
COPY --from=build /app/styles.css /usr/share/nginx/html/styles.css
# Clean URLs (/restaurant -> restaurant.html) + gzip + caching.
COPY --from=build /app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:80/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
