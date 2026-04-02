const knex = require('knex');

/**
 * Reutiliza a conexão em dev (hot-reload do Next.js cria múltiplas instâncias).
 * Em produção cada worker tem uma única conexão.
 */
if (!global._knex) {
  global._knex = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 1, max: 5 },
  });
}

module.exports = global._knex;
