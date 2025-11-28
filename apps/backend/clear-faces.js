const { PrismaClient } = require('@prisma/client');

async function clearFaces() {
  const prisma = new PrismaClient();
  
  try {
    // Limpiar descriptores en Practitioner
    const result = await prisma.practitioner.updateMany({
      data: { 
        faceDescriptor: null,
        faceImage: null,
        faceRegisteredAt: null
      }
    });
    
    console.log('✅ Descriptores faciales eliminados:', result.count);
    
    // Verificar
    const usersWithFace = await prisma.practitioner.count({
      where: { faceDescriptor: { not: null } }
    });
    console.log('👤 Usuarios con rostro registrado:', usersWithFace);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearFaces();
