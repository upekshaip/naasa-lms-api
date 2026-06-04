import { IsString, IsNotEmpty, Length, IsEnum } from 'class-validator';

export class UpdateUserRolesDto {
  @IsNotEmpty()
  @IsString()
  @IsEnum(['student', 'teacher', 'admin'], {
    message: 'Role must be one of: student, teacher, admin',
  })
  role!: string;
}
