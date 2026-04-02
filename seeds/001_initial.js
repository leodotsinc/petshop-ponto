const bcrypt = require('bcryptjs');

exports.seed = async function (knex) {
  const existing = await knex('settings').where('key', 'admin_password').first();
  if (existing) return;

  const hash = await bcrypt.hash('admin123', 10);

  await knex('settings').insert([
    { key: 'admin_password', value: hash },
    { key: 'store_name', value: 'Pet Shop' },
  ]);
};
