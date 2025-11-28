import { Module } from '@nestjs/common';
import { FinancieroController } from './financiero.controller';
import { FinancieroService } from './financiero.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinancieroController],
  providers: [FinancieroService],
  exports: [FinancieroService],
})
export class FinancieroModule {}
