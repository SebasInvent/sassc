import { Module } from '@nestjs/common';
import { CapsController } from './caps.controller';
import { CapsService } from './caps.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CapsController],
  providers: [CapsService],
  exports: [CapsService],
})
export class CapsModule {}
