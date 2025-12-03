import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Prisma conectado a la base de datos');
    } catch (error) {
      console.warn('⚠️ No se pudo conectar a la base de datos:', error.message);
      console.warn('⚠️ El lector de cédulas funcionará, pero las operaciones de BD fallarán');
    }
  }
}