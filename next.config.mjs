/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['knex', 'pg', 'pg-native', 'bcryptjs', 'jsonwebtoken'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Knex inclui dialetos opcionais que não usamos (Oracle, MSSQL, etc).
    // Dizemos ao webpack para ignorá-los em vez de tentar resolvê-los.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      oracledb: false,
      'better-sqlite3': false,
      mysql: false,
      mysql2: false,
      sqlite3: false,
      tedious: false,
    };
    return config;
  },
};

export default nextConfig;
