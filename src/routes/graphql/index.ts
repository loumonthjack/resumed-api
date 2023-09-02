import Website from './website';
import Resume from './resume';
import User from './user';
import Auth from './auth';
import Payment from './payment';

const resolvers = {
  Query: {
    resume: Resume.get,
    resumes: Resume.getAll,
    websites: Website.getAll,
    website: Website.get,
    user: User.get,
    webhook: Payment.webhook,
    domainAvailability: Website.domainAvailability,
    // users: User.getAll,
  },
  Mutation: {
    login: Auth.login,
    register: Auth.register,
    verify: Auth.verify,
    logout: Auth.logout,
    userUpdate: User.update,
    resumeUpsert: Resume.upsert,
    resumeDelete: Resume.delete,
    websiteUpsert: Website.upsert,
    websiteDelete: Website.delete,
    resumeUpload: Resume.upload,
    customDomainCreate: Website.createCustomDomain,
    // resumeEnhance: Resume.enhance,
    // userDelete: User.delete,
  },
};

export default resolvers;
