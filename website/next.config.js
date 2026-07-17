/** @type {import('next').NextConfig} */
module.exports = {
  // Static HTML export → served by nginx (same 8080 deploy as before),
  // but the source is a real Next.js + React app, like the portal.
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
  trailingSlash: false,
};
