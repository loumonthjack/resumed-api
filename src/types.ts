export type ResumeType = {
  id: string;
  bio: string;
  education?: EducationType[];
  experience?: ExperienceType[];
  skills?: SkillType[];
  awards?: AwardType[];
  userId: string;
};

export type EducationType = {
  school?: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
};

export type ExperienceType = {
  company?: string;
  position?: string;
  description?: string;
  start?: string;
  end?: string;
};

export type SkillType = {
  name?: string;
};

export type AwardType = {
  title?: string;
  date?: string;
};

export type UserType = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  externalId: string | null;
  lastLogin: Date | null;
  type: string | null;
};

export type SocialType = {
  id: string;
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  github: string;
};

export type SessionType = {
  id: string;
  userId: string;
  code: string;
  verified: boolean;
  createdAt: string | Date;
  expiresAt: string | Date;
};

export type WebsiteType = {
  id?: string;
  userId: string;
  templateName: string;
  url: string;
  status: 'pending' | 'complete' | 'error';
  alias?: string;
  colors: string;
};

export type DocumentType = {
  id: string;
  type: 'json' | 'pdf' | 'html' | 'txt';
};

export type SERVICE_NAMES =
  | 'Resume'
  | 'Auth'
  | 'Payment'
  | 'Session'
  | 'User'
  | 'Plan'
  | 'Email'
  | 'Export'
  | 'Template'
  | 'Website'
  | 'Contact'
  | 'GraphQL';

export type LOG_STATUSES = 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
