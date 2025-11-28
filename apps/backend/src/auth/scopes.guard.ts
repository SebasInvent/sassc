import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class ScopesGuard extends JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const baseActivation = await super.canActivate(context);
    if (!baseActivation) {
      return false;
    }

    const requiredScopes = this.reflector.get<string[]>('scopes', context.getHandler());
    if (!requiredScopes) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userScopes = user.scope?.split(' ') || [];
    
    return requiredScopes.every((scope) => userScopes.includes(scope));
  }
}