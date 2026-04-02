exports.up = async function (knex) {
  await knex.schema.createTable('employees', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable().unique();
    table.boolean('active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('records', (table) => {
    table.increments('id').primary();
    table
      .integer('employee_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('employees')
      .onDelete('CASCADE');
    table.enu('type', ['entrada', 'saida']).notNullable();
    table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.text('photo');
    table.decimal('lat', 10, 8).nullable();
    table.decimal('lng', 11, 8).nullable();
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('settings', (table) => {
    table.string('key', 255).primary();
    table.text('value').notNullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('records');
  await knex.schema.dropTableIfExists('employees');
  await knex.schema.dropTableIfExists('settings');
};
