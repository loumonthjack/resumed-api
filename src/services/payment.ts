import { Request, Response as ExpressResponse } from 'express';
import { ErrorResponse, SuccessResponse } from '../util/message';
import { DEFAULT_IMAGE, stripe } from '../util/helper';
import { PLAN_NAME, PLAN_TYPE, SUBSCRIPTION_STATUS } from '../constants';
import Session from './session';
import User from './user';
import Plan from './plan';
import PaymentDB from '../models/payment';
import BaseService from './base';

interface Response {
  message?: string;
  payment?: {
    expiresAt: Date;
    id: string;
    status: string;
    externalId: string;
    userId: string;
    planId: string;
    createdAt: Date;
    receiptUrl: string;
  };
  code: number;
}
export const PREMIUM_PLAN = 'PREMIUM';
export const FREE_PLAN = 'FREE';
class PaymentService extends BaseService<'PaymentService'> {
  async create(args: {
    status: string;
    externalId: string;
    userId: string;
    planId: string;
    receiptUrl?: string;
  }): Promise<Response> {
    const planResponse = await Plan.get(args.planId);
    if (!planResponse.plan) return ErrorResponse();
    const expiration = new Date();
    if (
      planResponse.plan.name === PLAN_NAME.PREMIUM
    ) {
      expiration.setFullYear(expiration.getFullYear() + 1);
    }
    const payment = await PaymentDB.create({
      ...args,
      createdAt: new Date(),
      expiresAt: expiration,
      receiptUrl: args.receiptUrl || '',
    });
    if (!payment) return ErrorResponse();
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse();
    const userType = planResponse.plan.name.includes(PLAN_NAME.PREMIUM)
      ? PREMIUM_PLAN
      : FREE_PLAN;
    
    await User.update({
      ...userResponse.user,
      type: userType,
    });
    await Session.create(args.userId, String(userResponse.user.email));
    return this.response({ payment: payment });
  }
  async get(paymentId: string): Promise<Response> {
    const payment = await PaymentDB.get(paymentId);
    if (!payment) return ErrorResponse();
    return this.response({ payment: payment });
  }
  async getByExternalId(externalId: string): Promise<Response> {
    const payment = await PaymentDB.getByExternalId(externalId);
    if (!payment) return ErrorResponse();
    return this.response({ payment: payment });
  }
  async getByUserId(userId: string): Promise<Response> {
    const payment = await PaymentDB.getByUserId(userId);
    if (!payment) return ErrorResponse();
    return this.response({ payment: payment[0] });
  }
  async delete(paymentId: string): Promise<Response> {
    const payment = await PaymentDB.delete(paymentId);
    if (!payment) return ErrorResponse();
    return this.response({ payment: payment });
  }
  async update(
    paymentId: string,
    args: {
      expiresAt?: Date;
      status: string;
      externalId: string;
      createdAt: Date;
      userId: string;
      planId: string;
      receiptUrl?: string;
    }
  ): Promise<Response> {
    const response = await this.get(paymentId);
    if (!response.payment) return ErrorResponse();
    const data = {
      ...response.payment,
    };
    if (args.status) data.status = args.status;
    if (args.externalId) data.externalId = args.externalId;
    if (args.createdAt) data.createdAt = args.createdAt;
    if (args.userId) data.userId = args.userId;
    if (args.planId) data.planId = args.planId;
    if (args.expiresAt) data.expiresAt = args.expiresAt;
    if (args.receiptUrl) data.receiptUrl = args.receiptUrl;

    const payment = await PaymentDB.update(paymentId, data);
    if (!payment) return ErrorResponse();
    return this.response({ payment: payment });
  }
  getUserLatestPayment = async (id: string) => {
    const checkUserId = await this.getByUserId(id);
    if (!checkUserId.payment) {
      const checkExternalId = await this.getByExternalId(id);
      if (!checkExternalId.payment) return null;
      return checkExternalId.payment;
    }
    return checkUserId.payment;
  };
  async checkSubscription(userIdOrExternalId: string) {
    const userPayment = await this.getUserLatestPayment(userIdOrExternalId);
    if (!userPayment) return ErrorResponse();
    const subscription = await stripe.subscriptions.retrieve(
      userPayment.externalId
    );
    if (
      subscription.plan.product !==
      (await Plan.get(userPayment.planId)).plan?.externalId
    ) {
      await this.update(userPayment.id, {
        ...userPayment,
        planId: (
          await Plan.getByExternalId(subscription.plan.product)
        ).plan?.id as string,
      });
    }
    if (
      subscription.status === SUBSCRIPTION_STATUS.ACTIVE &&
      userPayment.status === SUBSCRIPTION_STATUS.INACTIVE
    ) {
      await this.update(userPayment.id, {
        ...userPayment,
        status: SUBSCRIPTION_STATUS.ACTIVE,
      });
      return true;
    }
    if (userPayment.expiresAt < new Date()) {
      await this.update(userPayment.id, {
        ...userPayment,
        status: SUBSCRIPTION_STATUS.INACTIVE,
      });
      return false;
    }
    return true;
  }
  async handleCharge(event: Request['body']) {
    if (!event.data.object.billing_details.email) return ErrorResponse();
    const response = await User.getByEmail(
      event.data.object.billing_details.email.toLowerCase()
    );
    if (!response.user) {
      const name = event.data.object.billing_details.name.split(' ');
      const response = await User.create({
        email: event.data.object.billing_details.email.toLowerCase(),
        firstName: name[0].toLowerCase(),
        externalId: event.data.object.customer,
        lastName: name.length > 1 ? name[1].toLowerCase() : '',
        profilePicture: DEFAULT_IMAGE,
        lastLogin: null,
        isOnboarding: true,
        type: PREMIUM_PLAN,
      });

      const planResponse = await Plan.getByName(PLAN_NAME.PREMIUM);
      if (!planResponse.plan) return ErrorResponse();
      await this.create({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        externalId: event.data.object.id,
        userId: response.user?.id as string,
        planId: planResponse.plan.id,
        receiptUrl: event.data.object.receipt_url,
      });
    }
    const payResponse = await this.getUserLatestPayment(
      response.user?.id as string
    );
    if (!payResponse) {
      const planResponse = await Plan.getByName(PLAN_NAME.PREMIUM);
      if (!planResponse.plan) return ErrorResponse();
      await this.create({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        externalId: '',
        userId: response.user?.id as string,
        planId: planResponse.plan.id,
        receiptUrl: event.data.object.receipt_url,
      });
      return;
    }
    await this.update(payResponse?.id, {
      ...payResponse,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      receiptUrl: event.data.object.receipt_url,
    });
    return;
  }
  async handleSubscription(event: Request['body']) {
    const userResponse = await User.getByExternalId(event.data.object.customer);
    const planResponse = await Plan.getByExternalId(
      event.data.object.plan.product
    );
    if (!userResponse.user || !planResponse.plan) return ErrorResponse();
    const paymentResponse = await this.getByUserId(userResponse.user.id);
    if (!paymentResponse.payment) {
      await this.create({
        status: SUBSCRIPTION_STATUS.ACTIVE,
        externalId: event.data.object.id,
        userId: userResponse.user.id,
        planId: planResponse.plan.id,
      });
      return;
    }
    if (userResponse.code && planResponse.code === 200) {
      await this.update(paymentResponse.payment.id, {
        ...paymentResponse.payment,
        planId: planResponse.plan.id,
        externalId: event.data.object.id,
      });
      return;
    } else {
      await this.update(paymentResponse.payment.id, {
        ...paymentResponse.payment,
        status: SUBSCRIPTION_STATUS.INACTIVE,
        planId: planResponse.plan.id,
        externalId: event.data.object.id,
      });
      return;
    }
  }
  async webhookEvent(request: Request, response: ExpressResponse) {
    const event = request.body;
    console.log(event);
    if (event.type === 'charge.succeeded') {
      await this.handleCharge(event);
      return response.status(200).json({ received: true });
    }
    if (event.type === 'customer.subscription.created') {
      await this.handleSubscription(event);
      return response.status(200).json({ received: true });
    }
    if (event.type === 'customer.subscription.updated') {
      await this.checkSubscription(event.data.object.id);
      return response.status(200).json({ received: true });
    }
    return response.status(200).json({ received: true });
  }
}

const Payment = new PaymentService();
export default Payment;
