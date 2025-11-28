// Script para probar las distancias entre descriptores
// Ejecutar: node test-face-distance.js

const { PrismaClient } = require('@prisma/client');

async function testDistances() {
  const prisma = new PrismaClient();
  
  try {
    const users = await prisma.practitioner.findMany({
      where: { faceDescriptor: { not: null } },
      select: { id: true, firstName: true, lastName: true, license: true, faceDescriptor: true }
    });
    
    console.log(`\n📊 ANÁLISIS DE DESCRIPTORES FACIALES`);
    console.log(`====================================`);
    console.log(`Total usuarios con rostro: ${users.length}\n`);
    
    if (users.length < 2) {
      console.log('⚠️ Necesitas al menos 2 usuarios registrados para comparar');
      return;
    }
    
    // Comparar todos los usuarios entre sí
    console.log('DISTANCIAS ENTRE USUARIOS:');
    console.log('─'.repeat(60));
    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i];
        const user2 = users[j];
        
        const desc1 = JSON.parse(user1.faceDescriptor);
        const desc2 = JSON.parse(user2.faceDescriptor);
        
        // Calcular distancia euclidiana
        let sum = 0;
        for (let k = 0; k < desc1.length; k++) {
          const diff = desc1[k] - desc2[k];
          sum += diff * diff;
        }
        const distance = Math.sqrt(sum);
        
        const name1 = `${user1.firstName} ${user1.lastName}`.substring(0, 25);
        const name2 = `${user2.firstName} ${user2.lastName}`.substring(0, 25);
        
        console.log(`${name1} vs ${name2}`);
        console.log(`  Distancia: ${distance.toFixed(4)}`);
        console.log(`  ¿Misma persona? ${distance < 0.6 ? '✅ SÍ (< 0.6)' : '❌ NO (>= 0.6)'}`);
        console.log('');
      }
    }
    
    // Mostrar primeros 5 valores de cada descriptor para ver si son únicos
    console.log('\nPRIMEROS 5 VALORES DE CADA DESCRIPTOR:');
    console.log('─'.repeat(60));
    users.forEach(user => {
      const desc = JSON.parse(user.faceDescriptor);
      const first5 = desc.slice(0, 5).map(n => n.toFixed(4)).join(', ');
      console.log(`${user.firstName} ${user.lastName}: [${first5}...]`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDistances();
