import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service'; // <-- AÑADIR
import { AuthController } from './auth.controller'; // <-- AÑADIR

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'a-very-secret-key-for-dev',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [JwtStrategy, AuthService], // <-- AÑADIR AuthService
  controllers: [AuthController], // <-- AÑADIR AuthController
  exports: [],
})
export class AuthModule {}