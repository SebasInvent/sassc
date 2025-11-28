import { Module } from '@nestjs/common';
import { RipsController } from './rips.controller';
import { RipsService } from './rips.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RipsController],
  providers: [RipsService],
  exports: [RipsService],
})
export class RipsModule {}
