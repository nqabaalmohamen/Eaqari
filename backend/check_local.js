const { Client } = require('pg');
const c = new Client('postgresql://neondb_owner:npg_NQDzZc3qRg5F@ep-plain-rice-ay2coarh-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require');
c.connect()
  .then(() => c.query("SHOW search_path"))
  .then(r => console.log(r.rows))
  .then(() => c.query("SELECT * FROM public.\"Role\" LIMIT 1"))
  .then(r => console.log(r.rows))
  .catch(e => console.error(e))
  .finally(() => c.end());
