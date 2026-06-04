import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private allowedRoles: string[]) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: Request = context.switchToHttp().getRequest();

    if (!req.userId || !req.email) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }

    const userRoles = {
      isAdmin: req.isAdmin,
      isStudent: req.isStudent,
      isTeacher: req.isTeacher,
    };

    const hasRole = this.allowedRoles.some((role) => userRoles[role]);
    if (!hasRole) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
