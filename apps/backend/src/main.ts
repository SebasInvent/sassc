import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // CORS configuración para producción
  const corsOrigins = process.env.CORS_ORIGINS || 'http://localhost:3000';
  
  app.enableCors({
    origin: true, // Permitir todos los orígenes en desarrollo
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });
  
  console.log('🔒 CORS enabled');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // Solo usar interceptor de auditoría si Prisma está disponible
  try {
    const prismaService = app.get(PrismaService);
    await prismaService.$connect();
    app.useGlobalInterceptors(new AuditInterceptor(prismaService));
    console.log('✅ Base de datos conectada');
  } catch (e) {
    console.warn('⚠️ Base de datos no disponible - continuando sin auditoría');
  }

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SASSC Backend running on port ${port}`);
}
bootstrap();
