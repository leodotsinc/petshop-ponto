const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const existing = await knex('settings').where('key', 'admin_password').first();
  if (existing) return;

  // Senha inicial definida via variável de ambiente.
  // Em produção, defina ADMIN_INITIAL_PASSWORD antes de rodar as seeds.
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error(
      'Variável ADMIN_INITIAL_PASSWORD não definida. ' +
      'Defina-a antes de rodar as seeds (ex: ADMIN_INITIAL_PASSWORD=suasenha npm run seed).',
    );
  }

  const hash = await bcrypt.hash(initialPassword, 12);

  await knex('settings').insert([
    { key: 'admin_password', value: hash },
    { key: 'store_name', value: process.env.STORE_NAME || 'Pet Shop' },
  ]);
};
