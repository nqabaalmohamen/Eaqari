const fs = require('fs');
const file = 'd:/Eaqari/backend/src/controllers/authController.ts';
let text = fs.readFileSync(file, 'utf8');

const targetEmail = `    const existingByEmail = await prisma.user.findFirst({ where: { email } });\r
    if (existingByEmail) {\r
      res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });\r
      return;\r
    }`;

const targetEmail2 = `    const existingByEmail = await prisma.user.findFirst({ where: { email } });\n    if (existingByEmail) {\n      res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });\n      return;\n    }`;


const replacementEmail = `    const existingByEmail = await prisma.user.findFirst({ where: { email } });
    if (existingByEmail) {
      if (existingByEmail.is_verified) {
        res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل' });
        return;
      } else {
        await prisma.user.delete({ where: { id: existingByEmail.id } });
      }
    }`;
    
const targetPhone = `    const existingByPhone = await prisma.user.findFirst({ where: { phone } });\r
    if (existingByPhone) {\r
      res.status(400).json({ message: 'رقم الهاتف مسجل من قبل' });\r
      return;\r
    }`;
const targetPhone2 = `    const existingByPhone = await prisma.user.findFirst({ where: { phone } });\n    if (existingByPhone) {\n      res.status(400).json({ message: 'رقم الهاتف مسجل من قبل' });\n      return;\n    }`;

const replacementPhone = `    const existingByPhone = await prisma.user.findFirst({ where: { phone } });
    if (existingByPhone) {
      if (existingByPhone.is_verified) {
        res.status(400).json({ message: 'رقم الهاتف مسجل من قبل' });
        return;
      } else {
        await prisma.user.delete({ where: { id: existingByPhone.id } });
      }
    }`;

if (text.includes(targetEmail)) text = text.replace(targetEmail, replacementEmail);
else text = text.replace(targetEmail2, replacementEmail);

if (text.includes(targetPhone)) text = text.replace(targetPhone, replacementPhone);
else text = text.replace(targetPhone2, replacementPhone);

fs.writeFileSync(file, text);
