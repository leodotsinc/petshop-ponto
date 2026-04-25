try {
  const dotenv = require('dotenv');
  dotenv.config({ path: '.env.local' });
  dotenv.config({ path: '.env' });
} catch (_) {}

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
