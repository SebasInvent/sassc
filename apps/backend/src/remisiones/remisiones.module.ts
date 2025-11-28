import { Module } from '@nestjs/common';
import { RemisionesController } from './remisiones.controller';
import { RemisionesService } from './remisiones.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RemisionesController],
  providers: [RemisionesService],
  exports: [RemisionesService],
})
export class RemisionesModule {}
