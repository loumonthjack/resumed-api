import prisma from './prisma-client';
import {Payment as PaymentType} from '@prisma/client';
const db = prisma.payment;

class PaymentModel {
  async create(data: Omit<PaymentType, 'id'>): Promise<PaymentType | null> {
    const payment = await db.create({
      data: {
        ...data,
      },
    });
    return payment ? payment : null;
  }

  async get(id: string): Promise<PaymentType | null> {
    const payment = await db.findUnique({
      where: {
        id,
      },
    });
    return payment ? payment : null;
  }

  async getByUserId(userId: string): Promise<PaymentType[] | null> {
    const payment = await db.findMany({
      where: {
        userId,
      },
    });
    return payment ? payment : null;
  }

  async getByExternalId(externalId: string): Promise<PaymentType | null> {
    const payment = await db.findUnique({
      where: {
        externalId,
      },
    });
    return payment ? payment : null;
  }

  async update(
    id: string,
    data: Omit<PaymentType, 'id'>
  ): Promise<PaymentType | null> {
    const payment = await db.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });
    return payment ? payment : null;
  }

  async delete(id: string): Promise<PaymentType | null> {
    const payment = await db.delete({
      where: {
        id,
      },
    });
    return payment ? payment : null;
  }
}
const PaymentDB = new PaymentModel();
export default PaymentDB;
