exports.up = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.string('pin_hash', 255).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.dropColumn('pin_hash');
  });
};
