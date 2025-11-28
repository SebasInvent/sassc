import { Module } from '@nestjs/common';
import { PreventivoController } from './preventivo.controller';
import { PreventivoService } from './preventivo.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PreventivoController],
  providers: [PreventivoService],
  exports: [PreventivoService],
})
export class PreventivoModule {}
