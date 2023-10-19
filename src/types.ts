export type ResumeType = {
  id: string;
  bio: string;
  education?: EducationType[];
  experience?: ExperienceType[];
  //projects?: ProjectType[];
  skills?: SkillType[];
  awards?: AwardType[];
  links?: LinkType[];
  userId: string;
};

export type EducationType = {
  school?: string;
  degree?: string;
  field?: string;
  achievements?: string[];
  start?: string;
  end?: string;
};

export type ProjectType = {
  name?: string;
  description?: string;
  url?: string;
  start?: string;
  end?: string;
};
export type ContactType = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
};
export type LinkType = {
  name?: string;
  url?: string;
};

export type ExperienceType = {
  company?: string;
  position?: string;
  achievements?: string[];
  start?: string;
  end?: string;
};

export type SkillType = {
  name?: string;
};

export type AwardType = {
  title?: string;
  description?: string;
  date?: string;
};

export type UserType = {
  id: string;
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  externalId: string | null;
  lastLogin: Date | null;
  isOnboarding: boolean;
  onboardingStage: number;
  type: string | null;
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
  template: string;
  url: string;
  status: 'pending' | 'complete' | 'error';
  alias?: string;
  theme: string;
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
