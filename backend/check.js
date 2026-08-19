const { Client } = require('pg');
const c = new Client('postgresql://neondb_owner:npg_NQDzZc3qRg5F@ep-plain-rice-ay2coarh-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require');
c.connect()
  .then(() => c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
  .then(r => console.log(r.rows))
  .then(() => c.end());
