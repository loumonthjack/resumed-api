import { isDev, isLocal } from "./util/helper";

export const PORT = process.env.PORT || 4000;
export const NODE_ENV = process.env.NODE_ENV || 'localhost';
export const DOMAIN_NAME = process.env.DOMAIN_NAME || '';

export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FRONTEND_ALIAS = process.env.FRONTEND_ALIAS || '';
export const SERVER_URL = process.env.SERVER_URL || isLocal ? 'http://localhost:4000' : isDev ? 'http://api.dev.resumed.website' : 'https://api.resumed.website';
const SERVER_ALIAS = process.env.SERVER_ALIAS || '';
export const ALLOWED_ORIGINS = [
  FRONTEND_URL,
  FRONTEND_ALIAS,
  SERVER_URL,
  SERVER_ALIAS,
];
export const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
export const AWS_REGION = process.env.AWS_REGION || '';
export const AWS_HOSTED_ZONE_ID = process.env.AWS_HOSTED_ZONE_ID || '';
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || '';

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

export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';

export const STATUS = {
  PENDING: 'pending',
  ERROR: 'error',
  COMPLETED: 'completed',
};

export const TEMPLATE = {
  MODERN: 'MODERN',
  BASIC: 'BASIC',
  MINIMAL: 'PROFESSIONAL',
};

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
}

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const STRIPE_BILLING_PORTAL =
  'https://billing.stripe.com/p/login/test_dR62aQeTFgLLcve4gg';
