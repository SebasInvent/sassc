import { Module } from '@nestjs/common';
import { MipresController } from './mipres.controller';
import { MipresService } from './mipres.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MipresController],
  providers: [MipresService],
  exports: [MipresService],
})
export class MipresModule {}
