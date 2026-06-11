import { HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

/**
 * Resolves which teacher's resources an operation should act on.
 * Admins may pass an explicit teacherId (query/body) to manage another
 * teacher's content; everyone else is always scoped to their own teacherId.
 */
export function resolveTeacherId(
  req: Request,
  override?: string | number | null,
): number {
  if (
    req.isAdmin &&
    override !== undefined &&
    override !== null &&
    override !== ''
  ) {
    const id = Number(override);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException('Invalid teacherId', HttpStatus.BAD_REQUEST);
    }
    return id;
  }
  if (!req.teacherId) {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
  return req.teacherId;
}
