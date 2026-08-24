const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({ select: { id: true, full_name: true, role_id: true } })
  .then(u => { console.log(JSON.stringify(u, null, 2)); })
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
