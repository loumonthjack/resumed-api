import Website from './website';
import Resume from './resume';
import User from './user';

const resolvers = {
  Query: {
    resume: Resume.get,
    resumes: Resume.getAll,
    websites: Website.getAll,
    website: Website.get,
    user: User.get,
  },
  Mutation: {
    //login: User.login,
    //register: User.create,
    //verify: User.verify,
    userUpdate: User.update,
    resumeCreate: Resume.create,
    resumeUpdate: Resume.update,
    resumeDelete: Resume.delete,
    websiteCreate: Website.create,
    websiteDelete: Website.delete,
  },
};

export default resolvers;
