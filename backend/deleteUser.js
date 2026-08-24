require('ts-node/register');
const { prisma } = require('./src/utils/prisma.ts');
async function main() {
  await prisma.user.deleteMany({
    where: { OR: [{ email: 'moh602915@gmail.com' }, { phone: '01095043989' }] }
  });
  console.log('User deleted');
}
main().catch(console.error).finally(() => prisma.$disconnect());
