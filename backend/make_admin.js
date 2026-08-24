const { prisma } = require('./src/utils/prisma');
const bcrypt = require('bcrypt');

async function makeAdmin() {
  try {
    let adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'Super Admin' } });
    }

    const email = 'admin@eaqari.com';
    const password_hash = await bcrypt.hash('123456', 10);

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role_id: adminRole.id }
      });
      console.log('Updated existing user admin@eaqari.com to Super Admin');
    } else {
      await prisma.user.create({
        data: {
          full_name: 'مشرف النظام',
          email,
          phone: '01000000000',
          password_hash,
          role_id: adminRole.id,
          governorate: 'الفيوم',
          address: '',
          is_verified: true,
        }
      });
      console.log('Created new Super Admin user: admin@eaqari.com / password: 123456');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
