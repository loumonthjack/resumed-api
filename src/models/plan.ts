import prisma from './prisma-client';
import {Plan as PlanType} from '@prisma/client';
const db = prisma.plan;

class PlanModel {
  async create(data: Omit<PlanType, 'id'>): Promise<PlanType | null> {
    const plan = await db.create({
      data: {
        ...data,
      },
    });
    return plan ? plan : null;
  }

  async get(id: string): Promise<PlanType | null> {
    const plan = await db.findUnique({
      where: {
        id,
      },
    });
    return plan ? plan : null;
  }

  async getAll(): Promise<PlanType[] | null> {
    const plans = await db.findMany();
    return plans ? plans : null;
  }

  async getByExternalId(externalId: string): Promise<PlanType | null> {
    const plan = await db.findUnique({
      where: {
        externalId,
      },
    });
    return plan ? plan : null;
  }

  async getByName(name: string): Promise<PlanType | null> {
    const plan = await db.findUnique({
      where: {
        name,
      },
    });
    return plan ? plan : null;
  }

  async update(
    id: string,
    data: Omit<PlanType, 'id'>
  ): Promise<PlanType | null> {
    const plan = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return plan ? plan : null;
  }

  async delete(id: string): Promise<PlanType | null> {
    const plan = await db.delete({
      where: {
        id,
      },
    });
    return plan ? plan : null;
  }
}
const PlanDB = new PlanModel();
export default PlanDB;
