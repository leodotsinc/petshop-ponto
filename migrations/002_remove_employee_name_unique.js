exports.up = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.dropUnique(['name']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.unique(['name']);
  });
};
