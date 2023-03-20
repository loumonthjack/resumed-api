import prisma from './prisma-client';
import {User as UserType} from '@prisma/client';
const db = prisma.user;

class UserModel {
  async create(data: Omit<UserType, 'id'>): Promise<UserType | null> {
    const user = await db.create({
      data: {
        ...data,
      },
    });
    return user ? user : null;
  }

  async get(id: string): Promise<UserType | null> {
    const user = await db.findUnique({
      where: {
        id,
      },
    });
    return user ? user : null;
  }
  async getAll(): Promise<UserType[] | null> {
    const users = await db.findMany();
    return users ? users : null;
  }

  async getByExternalId(externalId: string): Promise<UserType | null> {
    const user = await db.findUnique({
      where: {
        externalId,
      },
    });
    return user ? user : null;
  }

  async getByEmail(email: string): Promise<UserType | null> {
    const user = await db.findUnique({
      where: {
        email,
      },
    });
    return user ? user : null;
  }

  async update(
    id: string,
    data: Omit<UserType, 'id'>
  ): Promise<UserType | null> {
    const user = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return user ? user : null;
  }

  async delete(id: string): Promise<UserType | null> {
    const user = await db.delete({
      where: {
        id,
      },
    });
    return user ? user : null;
  }
}
const UserDB = new UserModel();
export default UserDB;