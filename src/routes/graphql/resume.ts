import Service from '../../services/resume';
import {ResumeType} from '../../types';
import {LogEvent} from '../../util/logger';

const Resume = {
  create: async (
    _: any,
    args: Omit<ResumeType, 'id'>,
    context: any
  ): Promise<ResumeType> => {
    const response = await Service.create({...args, userId: context.userId});
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
  update: async (
    _: any,
    args: ResumeType,
    context: any
  ): Promise<ResumeType> => {
    const response = await Service.update({...args, userId: context.userId});
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
  get: async (parent: any, args: any, context: any): Promise<ResumeType> => {
    const response = await Service.get(context.userId);
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
  getAll: async (parent: any, args: any, context: any): Promise<ResumeType> => {
    const response = await Service.getAll();
    if (!response.resume) {
      throw new Error(response.message);
    }
    await LogEvent(response.code, 'Resume', response, context);
    return response.resume;
  },
  delete: async (_: any, args: string, context: any): Promise<ResumeType> => {
    const response = await Service.delete(context.userId);
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
};

export default Resume;
