import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class UserIdentifyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req: Request = context.switchToHttp().getRequest();
    const req_param = req.params.userId;
    if (req.userId === parseInt(req_param)) {
      return true;
    } else if (req.isAdmin === true) {
      return true;
    }
    return false;
  }
}
