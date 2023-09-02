import {shield, or, rule, and} from 'graphql-shield';

const hasAccess = () => {
  return rule()(async (parent, args, {session}): Promise<boolean> => {
    return !!session?.userId;
  });
};

const hasAdminAccess = () => {
  return rule()(async (parent, args, {session}): Promise<boolean> => {
    return session?.isAdmin;
  });
};

const isAuthorized = hasAccess();

const isAdmin = hasAdminAccess();

export default shield(
  {
    Query: {
      resume: isAuthorized,
      resumes: isAuthorized, //  isAdmin ,
      websites: isAuthorized, // isAdmin,
      website: isAuthorized,
      user: isAuthorized,
      domainAvailability: isAuthorized,
      // users: isAdmin,
    },
    Mutation: {
      logout: isAuthorized,
      userUpdate: isAuthorized,
      resumeUpsert: isAuthorized,
      resumeDelete: isAuthorized,
      websiteUpsert: isAuthorized,
      websiteDelete: isAuthorized,
      resumeUpload: isAuthorized,
      customDomainCreate: isAuthorized,
      // resumeEnhance: isAuthorized,
      // userDelete: isAuthorized,
    },
  },
  {debug: true}
);
