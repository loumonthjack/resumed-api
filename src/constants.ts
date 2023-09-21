export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || 'localhost';
export const DOMAIN_NAME = process.env.DOMAIN_NAME || 'resumed.website';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'localhost:3000';
const getEnvironmentDomain = () => {
  if (NODE_ENV === 'development') return `api.dev.${DOMAIN_NAME}`;
  if (NODE_ENV === 'production') return `api.${DOMAIN_NAME}`;
  return NODE_ENV + ':' + PORT;
};
const getCurrentEnv = (): string => {
  if (NODE_ENV === 'development') {
    return 'dev';
  } else if (NODE_ENV === 'production') {
    return 'prod';
  }
  return 'local';
};

export const isLocal = getCurrentEnv() === 'local';
export const isDev = getCurrentEnv() === 'dev';
export const DEFAULT_IMAGE = `https://s3.us-west-2.amazonaws.com/app.${getCurrentEnv()}.${DOMAIN_NAME}/profile_pics/default.png`;
export const SERVER_URL = getEnvironmentDomain();
export const ENVIRONMENT = getCurrentEnv();
export const ALLOWED_ORIGINS = [
  'http://' + FRONTEND_URL,
  'https://' + FRONTEND_URL,
  'http://' + SERVER_URL,
  'https://' + SERVER_URL,
  'http://localhost:' + PORT,
];
export const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const AWS_REGION = process.env.AWS_REGION || '';
export const AWS_HOSTED_ZONE_ID = process.env.AWS_HOSTED_ZONE_ID || '';
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';
export const AWS_ACM_NAME = process.env.AWS_ACM_NAME || '';
export const AWS_ACM_VALUE = process.env.AWS_ACM_VALUE || '';
export const GMAIL_EMAIL = process.env.GMAIL_EMAIL || '';
export const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD || '';
export const SES_EMAIL = process.env.SES_EMAIL || '';
export const STRIPE_WEBHOOK_KEY =
  NODE_ENV === 'production'
    ? process.env.STRIPE_WEBHOOK_KEY
    : process.env.STRIPE_WEBHOOK_KEY_TEST || '';
export const STRIPE_SECRET_KEY =
  NODE_ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY
    : process.env.STRIPE_SECRET_KEY_TEST;

export const STATUS = {
  PENDING: 'pending',
  ERROR: 'error',
  COMPLETED: 'completed',
};

export const TEMPLATE = {
  0: 'MODERN',
  1: 'BASIC',
  2: 'PREMIUM',
};
export type TEMPLATE_TYPE = 0 | 1 | 2;

export const ERROR_RESPONSE = {
  MESSAGE: {
    GENERIC: 'Something Went Wrong',
    NOT_LOGGED_IN: 'Please Login to Continue',
    TIMEOUT: 'Request Timed Out',
    UNAUTHORIZED: 'Unauthorized',
    EXPIRED: 'Session Expired',
    NOT_VERIFIED: 'Please Verify',
    MISSING: 'Missing Required Fields',
    INVALID: 'Invalid Field Provided',
    ALREADY_EXIST: (entity: string) => `${entity} Already Exists`,
    NOT_FOUND: 'Not Found',
  },
};

export const SUCCESS_RESPONSE = {
  MESSAGE: {
    RUNNING: (serverLocation: string) =>
      `Server is Running At: ${serverLocation}`,
    SUCCESS: (endPoint: string) => `${endPoint} Response Successful`,
  },
};

export const PLAN_TYPE = {
  STARTER: {
    MONTHLY: 'starter_monthly',
    YEARLY: 'starter_yearly',
  },
  SUPERSTAR: {
    MONTHLY: 'superstar_monthly',
    YEARLY: 'superstar_yearly',
  },
};

export const PLAN_NAME = {
  FREE: 'free_plan',
  PREMIUM: 'superstar_plan',
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const STRIPE_BILLING_PORTAL =
  'https://billing.stripe.com/p/login/test_dR62aQeTFgLLcve4gg';
