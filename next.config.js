/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      /** 200 at /favicon.ico (Google crawlers expect it; serve same mark as SVG). */
      { source: '/favicon.ico', destination: '/deepchox-mark.svg' },
    ];
  },
};

module.exports = nextConfig;
