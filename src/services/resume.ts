import ResumeDB from '../models/resume';
import {ResumeType} from '../types';
import {ErrorResponse} from '../util/message';
import BaseService from './base';
import User from './user';

interface Response {
  message?: string;
  resume?: ResumeType;
  code: number;
}
class ResumeService extends BaseService<'ResumeService'> {
  async get(userId: string): Promise<Response> {
    const userResponse = await User.get(userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const resume = await ResumeDB.getByUserId(userId);
    return this.response({resume: resume});
  }
  async getAll(): Promise<Response> {
    const resumes = await ResumeDB.getAll();
    return this.response({resume: resumes});
  }
  async delete(userId: string): Promise<Response> {
    const userResponse = await User.get(userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const resume = await ResumeDB.delete(userId);
    if (!resume) return ErrorResponse();
    return this.response({resume: resume});
  }
  async create(args: Omit<ResumeType, 'id'>): Promise<Response> {
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const resume = await ResumeDB.create({
      bio: args.bio,
      education: args.education ? args.education : [],
      experience: args.experience ? args.experience : [],
      skills: args.skills ? args.skills : [],
      awards: args.awards ? args.awards : [],
      userId: args.userId,
    });
    if (!resume) return ErrorResponse();
    return this.response({resume: resume});
  }
  async update(args: ResumeType): Promise<Response> {
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const response = await this.get(userResponse.user.id);
    if (!response) return ErrorResponse('unauthorized');
    const data: Omit<ResumeType, 'id'> = {
      bio: response.resume?.bio || '',
      userId: args.userId,
    };
    if (args.bio !== response.resume?.bio) {
      data.bio = args.bio;
    }
    if (args.education !== response.resume?.education) {
      data.education = args.education;
    }
    if (args.experience !== response.resume?.experience) {
      data.experience = args.experience;
    }
    if (args.skills !== response.resume?.skills) {
      data.skills = args.skills;
    }
    if (args.awards !== response.resume?.awards) {
      data.awards = args.awards;
    }
    const updatedResume = await ResumeDB.update(args.id, {
      bio: data.bio,
      education: data.education ? data.education : [],
      experience: data.experience ? data.experience : [],
      skills: data.skills ? data.skills : [],
      awards: data.awards ? data.awards : [],
      userId: data.userId,
    });
    if (!updatedResume) return ErrorResponse();
    return this.response({resume: updatedResume});
  }
}

const Resume = new ResumeService();
export default Resume;
