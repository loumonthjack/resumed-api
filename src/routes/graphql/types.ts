import {gql} from 'apollo-server-core';

const typeDefs = gql`
  type Query {
    resume: Resume
    resumes: [Resume]
    websites: [Website]
    website: Website
    user: User
  }
  type Mutation {
    websiteCreate(templateName: String!, colors: ColorInput!): Website
    resumeCreate(
      bio: String!
      education: [EducationInput]!
      experience: [ExperienceInput]!
      skills: [SkillInput]!
      awards: [AwardInput]!
    ): Resume
    socialCreate(
      facebook: String
      twitter: String
      linkedin: String
      instagram: String
      github: String
    ): Social
    socialUpdate(
      id: ID!
      facebook: String
      twitter: String
      linkedin: String
      instagram: String
      github: String
    ): Social
    resumeUpdate(
      id: ID!
      bio: String
      education: [EducationInput]
      experience: [ExperienceInput]
      skills: [SkillInput]
      awards: [AwardInput]
    ): Resume
    userUpdate(
      id: ID!
      email: String
      firstName: String
      lastName: String
      profilePicture: String
    ): User
    resumeDelete(id: ID!): Resume
    websiteDelete(id: ID!): Website
  }

  type Colors {
    primary: String!
    secondary: String!
  }
  input ColorInput {
    primary: String!
    secondary: String!
  }

  type Resume {
    id: ID!
    bio: String
    education: [Education]
    experience: [Experience]
    skills: [Skill]
    awards: [Award]
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

  type Document {
    type: [String]
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
    templateName: String!
    url: String!
    status: String!
    alias: String
    colors: Colors!
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
    profilePicture: String
    externalId: String
    type: String
  }
  type Social {
    id: String!
    facebook: String
    twitter: String
    linkedin: String
    instagram: String
    github: String
  }
`;

export default typeDefs;
