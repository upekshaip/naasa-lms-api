import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { DatabaseService } from '../../database/database.service.js';

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  async searchStudents(query: string) {
    if (!query || query.trim() === '') {
      throw new HttpException(
        'Query parameter "q" is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const students = await this.db.studentProfile.findMany({
      where: {
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        studentId: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      take: 10,
    });
    return students;
  }

  // create(createStudentDto: CreateStudentDto) {
  //   return 'This action adds a new student';
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} student`;
  // }

  // update(id: number, updateStudentDto: UpdateStudentDto) {
  //   return `This action updates a #${id} student`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} student`;
  // }
}
