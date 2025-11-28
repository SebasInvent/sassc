import { Module } from '@nestjs/common';
import { AdresController } from './adres.controller';
import { AdresService } from './adres.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdresController],
  providers: [AdresService],
  exports: [AdresService],
})
export class AdresModule {}
