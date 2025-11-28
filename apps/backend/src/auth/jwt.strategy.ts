import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ¡IMPORTANTE! Usaremos una variable de entorno para el secreto en producción.
      secretOrKey: process.env.JWT_SECRET || 'a-very-secret-key-for-dev', 
    });
  }

  async validate(payload: any) {
    // En un futuro, aquí podríamos buscar el usuario en la DB:
    // return { userId: payload.sub, username: payload.username };
    // Por ahora, solo devolvemos el payload decodificado.
    return payload;
  }
}