import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('💰 Creando datos financieros de prueba...\n');

  // Obtener ADRES Regionales e IPS existentes
  const adresRegionales = await prisma.aDRESRegional.findMany();
  const ipsList = await prisma.iPS.findMany();

  if (adresRegionales.length === 0) {
    console.log('❌ No hay ADRES Regionales. Ejecuta primero: npx ts-node prisma/seed-caps-ips.ts');
    return;
  }

  if (ipsList.length === 0) {
    console.log('❌ No hay IPS. Ejecuta primero: npx ts-node prisma/seed-caps-ips.ts');
    return;
  }

  console.log(`📊 Encontrados: ${adresRegionales.length} ADRES Regionales, ${ipsList.length} IPS\n`);

  // Actualizar presupuestos de ADRES
  console.log('📊 Actualizando presupuestos de ADRES Regionales...');
  for (const adres of adresRegionales) {
    // Presupuesto basado en departamento (simulado)
    let presupuesto = 500000000000; // 500 mil millones base
    if (adres.departamento === 'Cundinamarca') presupuesto = 2000000000000; // 2 billones
    if (adres.departamento === 'Antioquia') presupuesto = 1500000000000; // 1.5 billones
    if (adres.departamento === 'Valle del Cauca') presupuesto = 1200000000000; // 1.2 billones

    await prisma.aDRESRegional.update({
      where: { id: adres.id },
      data: {
        presupuestoAnual: presupuesto,
        presupuestoEjecutado: presupuesto * 0.35, // 35% ejecutado
      },
    });
  }

  // Limpiar pagos existentes
  await prisma.pagoADRES.deleteMany();
  console.log('🧹 Pagos anteriores eliminados\n');

  // Crear pagos de prueba
  const conceptos = [
    'Pago servicios de hospitalización',
    'Pago procedimientos quirúrgicos',
    'Pago servicios de urgencias',
    'Pago consultas especializadas',
    'Pago servicios de laboratorio',
    'Pago servicios de imágenes diagnósticas',
    'Pago medicamentos de alto costo',
    'Pago terapias especializadas',
  ];

  const periodos = ['2024-09', '2024-10', '2024-11'];
  const estados = ['pendiente', 'procesado', 'procesado', 'procesado']; // Más procesados que pendientes

  const pagos = [];
  let pagoNum = 1;

  for (const adres of adresRegionales) {
    // Obtener IPS de la misma región
    const ipsRegion = ipsList.filter(ips => 
      ips.adresRegionalId === adres.id || 
      ips.departamento === adres.departamento
    );

    if (ipsRegion.length === 0) continue;

    // Crear 3-5 pagos por regional
    const numPagos = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < numPagos; i++) {
      const ips = ipsRegion[Math.floor(Math.random() * ipsRegion.length)];
      const concepto = conceptos[Math.floor(Math.random() * conceptos.length)];
      const periodo = periodos[Math.floor(Math.random() * periodos.length)];
      const estado = estados[Math.floor(Math.random() * estados.length)];
      
      // Monto entre 50 millones y 2 mil millones
      const monto = Math.floor(Math.random() * 1950000000) + 50000000;

      pagos.push({
        adresRegionalId: adres.id,
        ipsDestinoId: ips.id,
        concepto: `${concepto} - ${ips.nombre}`,
        monto,
        numeroFactura: `FAC-${adres.codigo}-${String(pagoNum).padStart(4, '0')}`,
        periodo,
        estado,
        fechaPago: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
      });
      
      pagoNum++;
    }
  }

  // Crear pagos en la base de datos
  let created = 0;
  for (const pago of pagos) {
    try {
      await prisma.pagoADRES.create({ data: pago });
      created++;
    } catch (error: any) {
      console.error(`Error creando pago:`, error.message);
    }
  }

  console.log(`✅ ${created} pagos creados\n`);

  // Estadísticas finales
  const totalPagos = await prisma.pagoADRES.count();
  const pagosPorEstado = await prisma.pagoADRES.groupBy({
    by: ['estado'],
    _count: true,
    _sum: { monto: true },
  });

  const montoTotal = await prisma.pagoADRES.aggregate({
    _sum: { monto: true },
  });

  console.log('═══════════════════════════════════════════');
  console.log('💰 RESUMEN FINANCIERO');
  console.log('═══════════════════════════════════════════');
  console.log(`📊 Total pagos: ${totalPagos}`);
  console.log(`💵 Monto total: $${(montoTotal._sum.monto || 0).toLocaleString()} COP`);
  console.log('\n📈 Por estado:');
  pagosPorEstado.forEach(e => {
    console.log(`   ${e.estado}: ${e._count} pagos - $${(e._sum.monto || 0).toLocaleString()}`);
  });
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
