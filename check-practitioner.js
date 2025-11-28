// Script simple para verificar si el practitioner existe
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://admin:admin@localhost:5432/sisalud'
    }
  }
});

async function main() {
  const license = 'MP-43423635';
  console.log(`\n🔍 Buscando practitioner con licencia: ${license}\n`);
  
  const practitioner = await prisma.practitioner.findUnique({
    where: { license },
    include: { user: true }
  });
  
  if (!practitioner) {
    console.log('❌ NO ENCONTRADO\n');
    return;
  }
  
  console.log('✅ ENCONTRADO:');
  console.log(JSON.stringify(practitioner, null, 2));
  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
