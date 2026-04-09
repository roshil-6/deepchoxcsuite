/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      /** Browsers still request /favicon.ico; we only ship SVG mark in public. */
      { source: '/favicon.ico', destination: '/deepchox-mark.svg', permanent: false },
    ];
  },
};

module.exports = nextConfig;
