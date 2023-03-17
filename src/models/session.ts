import prisma from './prisma-client';
import {Session as SessionType} from '@prisma/client';
const db = prisma.session;

class SessionModel {
  async create(data: Omit<SessionType, 'id'>): Promise<SessionType | null> {
    const session = await db.create({
      data: {
        ...data,
      },
    });
    return session ? session : null;
  }
  async update(
    id: string,
    data: Omit<SessionType, 'id'>
  ): Promise<SessionType | null> {
    const session = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return session ? session : null;
  }

  async delete(userIdOrId: string): Promise<SessionType | null> {
    const session = await db.delete({
      where: {
        id: userIdOrId,
      },
    });
    if (!session) {
      const id = userIdOrId;
      const session = await db.delete({
        where: {
          userId: id,
        },
      });
      return session ? session : null;
    }
    return session ? session : null;
  }

  async get(id: string): Promise<SessionType | null> {
    const session = await db.findUnique({
      where: {
        id,
      },
    });
    return session ? session : null;
  }

  async getByUserId(userId: string): Promise<SessionType | null> {
    const session = await db.findUnique({
      where: {
        userId,
      },
    });
    return session ? session : null;
  }

  async getByCode(code: string): Promise<SessionType | null> {
    const session = await db.findFirst({
      where: {
        code,
      },
    });
    return session ? session : null;
  }

  async getAll(): Promise<SessionType[] | null> {
    const sessions = await db.findMany();
    return sessions ? sessions : null;
  }
}
const SessionDB = new SessionModel();
export default SessionDB;
