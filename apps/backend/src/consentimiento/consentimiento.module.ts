import { Module } from '@nestjs/common';
import { ConsentimientoController } from './consentimiento.controller';
import { ConsentimientoService } from './consentimiento.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConsentimientoController],
  providers: [ConsentimientoService],
  exports: [ConsentimientoService],
})
export class ConsentimientoModule {}
