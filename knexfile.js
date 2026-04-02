try { require('dotenv').config({ path: '.env.local' }); } catch (_) {}

module.exports = {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};
