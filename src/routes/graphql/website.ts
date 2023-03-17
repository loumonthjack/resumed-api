import Service from '../../services/website';
import {WebsiteType} from '../../types';
import {LogEvent} from '../../util/logger';
const Website = {
  create: async (
    _: any,
    args: Omit<WebsiteType, 'id'>,
    context: any
  ): Promise<WebsiteType> => {
    const response = await Service.create({...args, userId: context.userId});
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
  get: async (parent: any, args: any, context: any): Promise<WebsiteType> => {
    const response = await Service.get(context.userId);
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
  getAll: async (
    parent: any,
    args: any,
    context: any
  ): Promise<WebsiteType> => {
    const response = await Service.getAll();
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
  delete: async (_: any, args: string, context: any): Promise<WebsiteType> => {
    const response = await Service.delete(context.userId);
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
};

export default Website;
