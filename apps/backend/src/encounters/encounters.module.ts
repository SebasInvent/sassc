import { Module } from '@nestjs/common';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'a-very-secret-key-for-dev',
      signOptions: { expiresIn: '1h' }, // Token de acceso a historia clínica dura 1 hora
    }),
  ],
  controllers: [EncountersController],
  providers: [EncountersService],
})
export class EncountersModule {}