# Kuza marketing site — static assets served by nginx.
# No build step: the site is plain HTML/CSS/JS with the design tokens copied
# from frontend/lib/design/tokens.css. No external font/icon CDNs.
FROM nginx:alpine

# Serve our static files.
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY tokens.css /usr/share/nginx/html/tokens.css

# nginx config (gzip + sane caching for a static marketing site).
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
