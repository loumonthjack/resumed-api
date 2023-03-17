import prisma from './prisma-client';
import {Website as WebsiteType} from '@prisma/client';
const db = prisma.website;

class WebsiteModel {
  async create(data: Omit<WebsiteType, 'id'>): Promise<WebsiteType | null> {
    const website = await db.create({
      data: {
        ...data,
      },
    });
    return website ? website : null;
  }

  async get(id: string): Promise<WebsiteType | null> {
    const website = await db.findUnique({
      where: {
        id,
      },
    });
    return website ? website : null;
  }

  async update(
    id: string,
    data: Omit<WebsiteType, 'id'>
  ): Promise<WebsiteType | null> {
    const website = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return website ? website : null;
  }

  async delete(userId: string): Promise<WebsiteType | null> {
    const website = await db.delete({
      where: {
        userId,
      },
    });
    return website ? website : null;
  }
  async getByUserId(userId: string): Promise<WebsiteType | null> {
    const website = await db.findUnique({
      where: {
        userId,
      },
    });
    return website ? website : null;
  }
  async getAll(): Promise<WebsiteType[] | null> {
    const websites = await db.findMany();
    return websites ? websites : null;
  }
}
const WebsiteDB = new WebsiteModel();
export default WebsiteDB;
