// import { PrismaClient } from '../generated/prisma/client';
// import { hashPassword } from '../src/utils/bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   const passwordHash = await hashPassword('123456');
//   const adminEmail = 'upekshaip@gmail.com';

//   // Create user if not exists
//   const user = await prisma.user.findUnique({
//     where: { email: adminEmail },
//   });

//   if (user) {
//     console.log('Admin user already exists. Skipping creation.');
//     return;
//   }

//   const adminUser = await prisma.user.upsert({
//     where: { email: adminEmail },
//     update: {},
//     create: {
//       name: 'Admin',
//       email: adminEmail,
//       password: passwordHash,
//       phone: '0000000000',
//       gender: 'm',
//       isAdmin: true,
//       isTeacher: true,
//       isStudent: true,
//       teacherProfile: { create: {} },
//       studentProfile: { create: {} },
//       adminProfile: { create: {} },
//     },
//   });

//   console.log('✅ Default admin created:');
//   console.log({
//     adminUser,
//   });
// }

// main().catch((e) => {
//   console.error(e);
//   process.exit(1);
// });
