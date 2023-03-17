import PlanDB from '../models/plan';
import {ErrorResponse, SuccessResponse} from '../util/message';
import BaseService from './base';

interface Response {
  message?: string;
  plan?: {
    id: string;
    name: string;
    externalId: string;
    createdAt: Date;
  };
  code: number;
}

class PlanService extends BaseService<'PlanService'> {
  async create(args: {
    name: string;
    externalId: string;
    createdAt: Date;
  }): Promise<Response> {
    const plan = await PlanDB.create(args);
    if (!plan) return ErrorResponse();
    return this.response({plan: plan});
  }
  async get(planId: string): Promise<Response> {
    const plan = await PlanDB.get(planId);
    if (!plan) return ErrorResponse();
    return this.response({plan: plan});
  }
  async getByExternalId(externalId: string): Promise<Response> {
    const plan = await PlanDB.getByExternalId(externalId);
    if (!plan) return ErrorResponse();
    return this.response({plan: plan});
  }
  async getAll(): Promise<Response> {
    const plans = await PlanDB.getAll();
    if (!plans) return ErrorResponse();
    return this.response({plan: plans});
  }
  async getByName(name: string): Promise<Response> {
    const plan = await PlanDB.getByName(name);
    if (!plan) return ErrorResponse();
    return this.response({plan: plan});
  }
}

const Plan = new PlanService();
export default Plan;
