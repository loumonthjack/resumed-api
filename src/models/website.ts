import prisma from './prisma-client';
import {Website as WebsiteType} from '@prisma/client';
const db = prisma.website;

class WebsiteModel {
  async create(data: Omit<WebsiteType, 'id'>): Promise<WebsiteType | null> {
    const website = await db.create({
      data: {
        url: data.url,
        template: data.template,
        theme: data.theme,
        userId: data.userId,
        alias: data.alias,
        status: data.status,
      },
    });
    return website ? website : null;
  }

  async get(userId: string): Promise<WebsiteType | null> {
    const website = await db.findUnique({
      where: {
        userId,
      },
    });
    return website ? website : null;
  }

  async update(
    userId: string,
    data: Omit<WebsiteType, 'id'>
  ): Promise<WebsiteType | null> {
    const website = await db.update({
      where: {
        userId,
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
