exports.up = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.string('cpf', 14).nullable();
    table.string('role', 120).nullable();
    table.date('admission_date').nullable();
  });

  await knex('settings')
    .insert([
      { key: 'employer_document', value: '' },
      { key: 'employer_registration', value: '' },
      { key: 'contractual_schedule', value: '' },
    ])
    .onConflict('key')
    .ignore();
};

exports.down = async function (knex) {
  await knex.schema.alterTable('employees', (table) => {
    table.dropColumn('cpf');
    table.dropColumn('role');
    table.dropColumn('admission_date');
  });

  await knex('settings')
    .whereIn('key', ['employer_document', 'employer_registration', 'contractual_schedule'])
    .delete();
};
