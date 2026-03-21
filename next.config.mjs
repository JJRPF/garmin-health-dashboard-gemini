/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      '@gooin/garmin-connect',
      'axios-cookiejar-support',
      'tough-cookie',
      'web-push'
    ],
  },
};

export default nextConfig;
