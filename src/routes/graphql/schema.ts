import {gql} from 'apollo-server-core';

const typeDefs = gql`
  scalar Upload
  type Query {
    resume: Resume
    resumes: [Resume]
    websites: [Website]
    website: Website
    user: User
    webhook: String
    domainAvailability(domain: String!): Boolean
  }
  type Mutation {
    login(email: String!): AuthResponse
    logout: AuthResponse
    verify(email: String!, code: String!): AuthVerifyResponse
    register(
      email: String!
      firstName: String!
      lastName: String!
      profilePicture: String
    ): AuthRegisterResponse
    websiteUpsert(template: TemplateEnum!, theme: ThemeEnum!): Website
    resumeUpsert(
      bio: String
      education: [EducationInput]
      experience: [ExperienceInput]
      skills: [SkillInput]
      awards: [AwardInput]
    ): Resume
    userUpdate(
      id: ID!
      firstName: String
      lastName: String
      profilePicture: String
      isOnboarding: Boolean
    ): User
    resumeDelete(id: ID!): Resume
    websiteDelete(id: ID!): Website
    resumeUpload(uploadFile: Upload!): Resume
    customDomainCreate(domain: String!): Website
  }
  type AuthResponse {
    success: Boolean
  }
  type AuthVerifyResponse {
    token: String
  }
  type AuthRegisterResponse {
    user: User
  }

  type Resume {
    id: ID!
    bio: String
    education: [Education]
    experience: [Experience]
    skills: [Skill]
    awards: [Award]
    links: [Link]
  }

  type Link {
    name: String!
    url: String!
  }

  type Education {
    school: String!
    degree: String!
    field: String!
    start: String
    end: String
  }

  type Experience {
    company: String!
    position: String!
    description: String
    start: String
    end: String
  }

  type Skill {
    name: String
  }

  type Award {
    title: String!
    date: String
  }

  input EducationInput {
    school: String!
    degree: String!
    field: String!
    start: String
    end: String
  }
  input ExperienceInput {
    company: String!
    position: String!
    description: String
    start: String
    end: String
  }
  input SkillInput {
    name: String
  }
  input AwardInput {
    title: String!
    date: String
  }
  type Website {
    id: String!
    userId: String!
    template: TemplateEnum!
    url: String!
    status: String!
    alias: String
    theme: ThemeEnum!
  }
  enum TemplateEnum {
    BASIC
    MODERN
    PROFESSIONAL
  }
  enum ThemeEnum {
    DARK
    LIGHT
  }
  type Session {
    id: String!
    userId: String!
    code: String!
    createdAt: String!
    expiresAt: String!
  }
  type User {
    id: String!
    email: String!
    firstName: String!
    lastName: String!
    onboardingStage: Int
    profilePicture: String
    externalId: String
    type: String
    isOnboarding: Boolean
  }
`;

export default typeDefs;
