import prisma from './prisma-client';
import {Social as SocialType} from '@prisma/client';
const db = prisma.social;

class SocialModel {
  async create(data: Omit<SocialType, 'id'>): Promise<SocialType | null> {
    const social = await db.create({data: data});
    return social ? social : null;
  }
  async update(
    id: string,
    data: Omit<SocialType, 'id'>
  ): Promise<SocialType | null> {
    const social = await db.update({
      where: {
        id: id,
      },
      data: data,
    });
    return social ? social : null;
  }
  async delete(id: string): Promise<SocialType | null> {
    const social = await db.delete({
      where: {
        id,
      },
    });
    return social ? social : null;
  }
  async get(id: string): Promise<SocialType | null> {
    const social = await db.findUnique({
      where: {
        id,
      },
    });
    return social ? social : null;
  }
  async getByUserId(userId: string): Promise<SocialType | null> {
    const social = await db.findUnique({
      where: {
        userId,
      },
    });
    return social ? social : null;
  }
}
const Social = new SocialModel();
export default Social;
