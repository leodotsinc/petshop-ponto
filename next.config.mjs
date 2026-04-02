/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['knex', 'pg', 'pg-native', 'bcryptjs', 'jsonwebtoken'],

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
