import ResumeDB from '../models/resume';
import {
  AwardType,
  EducationType,
  ExperienceType,
  LinkType,
  ResumeType,
  SkillType,
} from '../types';
import {ErrorResponse} from '../util/message';
import BaseService from './base';
import {uploadResume} from './external/aws';
import AI from './external/openai';
import User from './user';
import fs from 'fs';
import {readPdfText} from 'pdf-text-reader';

interface Response {
  message?: string;
  resume?: ResumeType;
  code: number;
}
class ResumeService extends BaseService<'ResumeService'> {
  /*async improve(
    userId: string,
    field: 'bio' | 'experience' | 'education' | 'skills' | 'awards' | 'links',
    arrayNumber?: number
  ): Promise<Response> {
    const userResponse = await User.get(userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const resumeResponse = await this.get(userId);
    if (!resumeResponse.resume) return ErrorResponse(resumeResponse.message);
    const data = resumeResponse.resume[field];
    if (!data) return ErrorResponse();
    let enhanceData = '';
    if (field === 'bio') {
      if (typeof data !== 'string') return ErrorResponse();
      enhanceData = data;
    } else if (field === 'experience') {
      if (!arrayNumber) return ErrorResponse();
      const experience = data[arrayNumber] as ExperienceType;
      const description = experience.achievements;
      if (!description) return ErrorResponse();
      enhanceData = description;
    }
    const enhancedResume = (changedData: string | undefined) => {
      const resume = resumeResponse.resume;
      if (field === 'bio') {
        return {
          bio: changedData,
          education: resume?.education,
          experience: resume?.experience,
          skills: resume?.skills,
          awards: resume?.awards,
          links: resume?.links,
        };
      } else if (field === 'experience') {
        const experience = resume?.experience![arrayNumber!];
        experience!.achievements = changedData;
        return {
          bio: resume?.bio,
          education: resume?.education,
          experience: resume?.experience,
          skills: resume?.skills,
          awards: resume?.awards,
          links: resume?.links,
        };
      }
      return {
        bio: resume?.bio,
        education: resume?.education,
        experience: resume?.experience,
        skills: resume?.skills,
        awards: resume?.awards,
        links: resume?.links,
      };
    };
    const prompt = `Write the following statement in a more professional way: \n Statement: "${enhanceData}"`;
    const aiResponse = await AI.complete(prompt);
    const resumeData = JSON.parse(aiResponse!);
    const enhance = enhancedResume(resumeData);
    if (!enhance) return ErrorResponse();

    const response = await this.upsert(userId, enhance);
    if (!response.resume) return ErrorResponse();
    return this.response({resume: response.resume});
  }*/
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
  async upsert(
    userId: string,
    args: Partial<Omit<ResumeType, 'id' | 'userId'>>
  ): Promise<Response> {
    const resumeResponse = await this.get(userId);
    if (!resumeResponse.resume) {
      return this.create({...args, userId: userId});
    }
    return this.update({...args, userId: userId});
  }
  async create(
    args: Partial<ResumeType> & {userId: string}
  ): Promise<Response> {
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const resume = await ResumeDB.create({
      bio: args.bio ? args.bio : '',
      education: args.education ? args.education : [],
      experience: args.experience ? args.experience : [],
      skills: args.skills ? args.skills : [],
      awards: args.awards ? args.awards : [],
      links: args.links ? args.links : [],
      userId: args.userId,
    });
    if (!resume) return ErrorResponse();
    return this.response({resume: resume});
  }
  async upload(userId: string, file: string): Promise<Response> {
    const link = await uploadResume(userId, file);
    if (!link) return ErrorResponse();

    const pages = await readPdfText(link);
    if (!pages) return ErrorResponse();

    const educationData: EducationType = {
      school: '',
      degree: '',
      field: '',
      start: '',
      end: '',
      achievements: [],
    };
    const experienceData: ExperienceType = {
      company: '',
      position: '',
      achievements: [],
      start: '',
      end: '',
    };
    const skillData: SkillType = {
      name: '',
    };
    const awardData: AwardType = {
      title: '',
      description: '',
      date: '',
    };
    const linkData: LinkType = {
      name: '',
      url: '',
    };
    const data: Pick<
      ResumeType,
      'bio' | 'education' | 'experience' | 'skills' | 'awards' | 'links'
    > & {
      education: EducationType[];
      experience: ExperienceType[];
      skills: SkillType[];
      awards: AwardType[];
      links: LinkType[];
    } = {
      bio: '',
      education: [educationData],
      experience: [experienceData],
      skills: [skillData],
      awards: [awardData],
      links: [linkData],
    };
    const resumeString = JSON.stringify(data);

    const prompt = `This is a resume. Please fill in the following fields with the data from the resume.
    ${resumeString}, Remove and clean data, here is data:${pages[0].lines}:
    Map as much data as possible, Delete any data that is not mapped to the resume data. Create a resume from the data. 
    Be sure Bio, Experience, Education, Skills, Awards, Links are filled out. Return in JSON format, double check accuracy to each field.`;

    console.time('openai');
    const response = await AI.complete(prompt);

    const resumeData = JSON.parse(response!);
    console.timeEnd('openai');

    const resume = {
      bio: '',
      education: [],
      experience: [],
      skills: [],
      awards: [],
      links: [],
    };
    const validateDates = function (
      experience: ExperienceType['start'] | ExperienceType['end']
    ) {
      const date = experience?.split(' ');
      return date && date[1]
        ? `${
            date[0].charAt(0)?.toUpperCase() + date[0].slice(1).toLowerCase()
          } ${date[1]}`
        : date &&
            date[0].charAt(0)?.toUpperCase() + date[0].slice(1).toLowerCase();
    };
    if (resumeData.bio) {
      resume['bio'] = resumeData.bio;
    }
    if (resumeData.education) {
      resume['education'] = resumeData.education.map((education: any) => {
        education.start = validateDates(education.start);
        education.end = validateDates(education.end);
        return education;
      });
    }
    if (resumeData.experience) {
      resume['experience'] = resumeData.experience.map((experience: any) => {
        experience.start = validateDates(experience.start);
        experience.end = validateDates(experience.end);
        return experience;
      });
    }
    if (resumeData.skills) {
      resume['skills'] = resumeData.skills;
    }
    if (resumeData.awards) {
      resume['awards'] = resumeData.awards.map((award: any) => {
        award.date = validateDates(award.date);
        return award;
      });
    }
    if (resumeData.links) {
      resume['links'] = resumeData.links;
    }
    const resumeResponse = await this.upsert(userId, resume);
    if (!resumeResponse.resume) return ErrorResponse();
    return this.response({resume: resumeResponse.resume});
  }
  async update(
    args: Partial<ResumeType> & {userId: string}
  ): Promise<Response> {
    const userResponse = await User.get(args.userId);
    if (!userResponse.user) return ErrorResponse(userResponse.message);
    const response = await this.get(userResponse.user.id);
    if (!response.resume) return ErrorResponse('unauthorized');
    const updatedResume = await ResumeDB.update(response.resume.id, {
      ...response.resume,
      ...args,
      bio: args.bio
        ? args.bio
        : !response.resume.bio
        ? ''
        : response.resume.bio,
      education: args.education
        ? args.education
        : !response.resume.education
        ? []
        : response.resume.education,
      experience: args.experience
        ? args.experience
        : !response.resume.experience
        ? []
        : response.resume.experience,
      skills: args.skills
        ? args.skills
        : !response.resume.skills
        ? []
        : response.resume.skills,
      awards: args.awards
        ? args.awards
        : !response.resume.awards
        ? []
        : response.resume.awards,
      links: args.links
        ? args.links
        : !response.resume.links
        ? []
        : response.resume.links,
      userId: response.resume.userId,
    });
    if (!updatedResume) return ErrorResponse();
    return this.response({resume: updatedResume});
  }
}

const Resume = new ResumeService();
export default Resume;
