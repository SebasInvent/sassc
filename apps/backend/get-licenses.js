const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const practitioners = await prisma.practitioner.findMany({
    take: 5,
    select: {
      license: true,
      firstName: true,
      lastName: true,
      specialty: true,
    },
  });

  console.log('\n🔐 LOGIN CREDENTIALS:\n');
  console.log('Use any of these practitioner licenses to login:\n');
  
  practitioners.forEach((p, i) => {
    console.log(`${i + 1}. License: ${p.license}`);
    console.log(`   Name: ${p.firstName} ${p.lastName}`);
    console.log(`   Specialty: ${p.specialty}\n`);
  });
  
  console.log(`Example: Use license "${practitioners[0].license}" to login at http://localhost:3000/login\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
