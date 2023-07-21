import Service from '../../services/resume';
import { AwardType, EducationType, ExperienceType, ResumeType, SkillType } from '../../types';

const Resume = {
  upsert: async (
    _: any,
    args: {
      bio: string;
      education?: EducationType[];
      experience?: ExperienceType[];
      skills?: SkillType[];
      awards?: AwardType[];
    },
    context: any
  ): Promise<ResumeType> => {
    const response = await Service.upsert(context.session.userId, { ...args });
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
  upload: async (
    _: any,
    args: {
      file: string;
    },
    context: any
  ): Promise<ResumeType> => {
    const response = await Service.upload(context.session.userId, args.file);
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
  get: async (parent: any, args: any, context: any): Promise<ResumeType> => {
    const response = await Service.get(context.session.userId);
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
    return response.resume;
  },
  delete: async (_: any, args: string, context: any): Promise<ResumeType> => {
    const response = await Service.delete(context.session.userId);
    if (!response.resume) {
      throw new Error(response.message);
    }
    return response.resume;
  },
};

export default Resume;
