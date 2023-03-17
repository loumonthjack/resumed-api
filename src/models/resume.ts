import prisma from './prisma-client';
import {Resume as ResumeType} from '@prisma/client';
const db = prisma.resume;

class ResumeModel {
  async create(data: Omit<ResumeType, 'id'>): Promise<ResumeType | null> {
    const resume = await db.create({
      data: {
        ...data,
      },
    });
    return resume ? resume : null;
  }

  async get(id: string): Promise<ResumeType | null> {
    const resume = await db.findUnique({
      where: {
        id,
      },
    });
    return resume ? resume : null;
  }

  async getAll(): Promise<ResumeType[] | null> {
    const resumes = await db.findMany();
    return resumes ? resumes : null;
  }

  async update(
    id: string,
    data: Omit<ResumeType, 'id'>
  ): Promise<ResumeType | null> {
    const resume = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return resume ? resume : null;
  }

  async delete(userIdOrId: string): Promise<ResumeType | null> {
    const id = userIdOrId;
    const resume = await db.delete({
      where: {
        id,
      },
    });
    if (!resume) {
      const resume = await db.delete({
        where: {
          userId: userIdOrId,
        },
      });
      return resume ? resume : null;
    }
    return resume ? resume : null;
  }
  async getByUserId(userId: string): Promise<ResumeType | null> {
    const resume = await db.findUnique({
      where: {
        userId,
      },
    });
    return resume ? resume : null;
  }
}
const ResumeDB = new ResumeModel();
export default ResumeDB;
