# Kuza marketing site — static, multi-page, served by nginx on :8080.
# No build step: plain HTML/CSS/JS. No external fonts/icons/images/CDNs —
# all visuals are CSS gradients + inline SVG. App links (Sign in / Start free)
# point at http://localhost:5001 and are env/prod-configurable (e.g. app.kuza.africa).
FROM nginx:alpine

# All marketing pages (index + product pages + pricing).
COPY *.html /usr/share/nginx/html/

# Shared assets.
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js     /usr/share/nginx/html/app.js

# nginx config: clean URLs (/restaurant -> restaurant.html) + gzip + caching.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
