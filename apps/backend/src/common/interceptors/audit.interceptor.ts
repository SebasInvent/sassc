import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditEventAction, AuditEventOutcome } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user } = request;

    return next.handle().pipe(
      tap(async (data) => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;

        const action = this.mapMethodToAction(method);
        const outcome = this.mapStatusCodeToOutcome(statusCode);

        await this.prisma.auditEvent.create({
          data: {
            action,
            outcome,
            outcomeDesc: `Request to ${url} finished with status ${statusCode}`,
            timestamp: new Date(),
            userId: user?.sub, // Asumimos que el ID del usuario está en 'sub' del payload del JWT
            sourceIp: ip,
            userAgent: request.headers['user-agent'],
            entityType: this.getEntityTypeFromUrl(url),
            reason: `HTTP ${method} on ${url}`,
          },
        });
      }),
    );
  }

  private mapMethodToAction(method: string): AuditEventAction {
    switch (method.toUpperCase()) {
      case 'POST':
        return AuditEventAction.C;
      case 'GET':
        return AuditEventAction.R;
      case 'PATCH':
      case 'PUT':
        return AuditEventAction.U;
      case 'DELETE':
        return AuditEventAction.D;
      default:
        return AuditEventAction.E; // Execute for other methods
    }
  }

  private mapStatusCodeToOutcome(statusCode: number): AuditEventOutcome {
    if (statusCode >= 200 && statusCode < 300) {
      return AuditEventOutcome.Success;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return AuditEventOutcome.MinorFailure;
    }
    return AuditEventOutcome.SeriousFailure;
  }
  
  private getEntityTypeFromUrl(url: string): string | undefined {
    const parts = url.split('/').filter(p => p); // e.g., ['fhir', 'Patient', '123']
    if (parts.length > 1 && parts[0].toLowerCase() === 'fhir') {
        return parts[1]; // e.g., 'Patient'
    }
    return undefined;
  }
}