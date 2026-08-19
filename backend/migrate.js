const { Client } = require('pg');

const remoteUrl = 'postgresql://neondb_owner:npg_NQDzZc3qRg5F@ep-plain-rice-ay2coarh-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require';
const localUrl = 'postgresql://postgres:postgres@localhost:5433/eaqari';

const tables = [
  '"Role"', '"Permission"', '"RolePermission"', '"User"', '"Setting"',
  '"Property"', '"PropertyFeature"', '"PropertyMedia"', '"Favorite"',
  '"Conversation"', '"Message"', '"Transaction"', '"Commission"',
  '"Payment"', '"Report"', '"VerificationRequest"', '"AdminLog"', '"Notification"'
];

async function migrate() {
  const remoteClient = new Client({ connectionString: remoteUrl });
  const localClient = new Client({ connectionString: localUrl });

  try {
    console.log('Connecting to remote...');
    await remoteClient.connect();
    console.log('Connecting to local...');
    await localClient.connect();

    await remoteClient.query("SET search_path TO public;");
    await localClient.query("SET search_path TO public;");

    console.log('Disabling foreign key checks locally...');
    for (const table of tables) {
      await localClient.query(`ALTER TABLE ${table} DISABLE TRIGGER ALL;`);
    }

    for (const table of tables) {
      console.log(`Copying ${table}...`);
      const { rows } = await remoteClient.query(`SELECT * FROM ${table};`);
      console.log(`Found ${rows.length} rows.`);

      if (rows.length === 0) continue;

      await localClient.query(`DELETE FROM ${table};`);

      for (const row of rows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        await localClient.query(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, values);
      }
    }

    console.log('Re-enabling foreign key checks locally...');
    for (const table of tables) {
      await localClient.query(`ALTER TABLE ${table} ENABLE TRIGGER ALL;`);
    }

    for (const table of tables) {
      try {
        await localClient.query(`SELECT setval('"${table.replace(/"/g, '')}_id_seq"', COALESCE((SELECT MAX(id)+1 FROM ${table}), 1), false);`);
      } catch (e) {
      }
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await remoteClient.end();
    await localClient.end();
  }
}

migrate();
