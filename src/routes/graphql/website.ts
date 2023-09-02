import Service from '../../services/website';
import {WebsiteType} from '../../types';
const Website = {
  upsert: async (
    _: any,
    args: {
      template: 'BASIC' | 'MODERN' | 'PROFESSIONAL';
      theme: 'DARK' | 'LIGHT';
    },
    context: {session: {userId: string}}
  ): Promise<WebsiteType> => {
    const response = await Service.create({
      ...args,
      userId: context.session.userId,
    });
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
  createCustomDomain: async (
    _: any,
    args: {
      domain: string;
    },
    context: {session: {userId: string}}
  ): Promise<WebsiteType> => {
    const response = await Service.createCustomDomain(
      args.domain,
      context.session.userId
    );
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
  domainAvailability: async (
    _: any,
    args: {
      domain: string;
    },
    context: any
  ): Promise<boolean> => {
    return await Service.getDomainAvailability(args.domain);
  },
  get: async (parent: any, args: any, context: any): Promise<WebsiteType> => {
    const response = await Service.get(context.session.userId);
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
    const response = await Service.delete(context.session.userId);
    if (!response.website) {
      throw new Error(response.message);
    }
    return response.website;
  },
};

export default Website;
