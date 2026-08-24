const { prisma } = require('./src/utils/prisma');

async function checkPending() {
  try {
    const props = await prisma.property.findMany({ where: { status: 'pending' } });
    console.log(JSON.stringify(props, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
checkPending();
