import path from 'path';
import fs from 'fs';
import Mustache from 'mustache';
import {AWS_BUCKET_NAME, ENVIRONMENT, SERVER_URL} from '../constants';

const BASE_PATH = '../templates';
export const AUTH_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/email/auth/login.html`))
  .toString();
export const WELCOME_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/email/auth/register.html`))
  .toString();

export const BASIC_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/website/basic/index.html`))
  .toString();

export const MODERN_LIGHT_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/modern/index-light.html`)
  )
  .toString();
export const MODERN_DARK_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/modern/index-dark.html`)
  )
  .toString();
export const PREMIUM_LIGHT_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/premium/index-light.html`)
  )
  .toString();
export const PREMIUN_DARK_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/premium/index-dark.html`)
  )
  .toString();
export const ERROR_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/website/error.html`))
  .toString();
export const CONTACT_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/email/contact.html`))
  .toString();
export const EVENT_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/email/event.html`))
  .toString();

export const NETWORK_EVENT_ONBOARDING_HTML = fs
  .readFileSync(
    path.join(
      __dirname,
      `${BASE_PATH}/website/networking/event-onboarding.html`
    )
  )
  .toString();

export const NETWORK_USER_ONBOARDING_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/networking/user-onboarding.html`)
  )
  .toString();

export const NETWORK_CODE_DISPLAY_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/networking/code-display.html`)
  )
  .toString();

export const NETORK_EVENT_UPDATE_HTML = fs
  .readFileSync(
    path.join(__dirname, `${BASE_PATH}/website/networking/event-update.html`)
  )
  .toString();

export const renderTemplate = (
  template: string,
  data?: {
    [key: string]: any;
  },
  theme?: string
): string | null => {
  const templates = {
    basic: BASIC_HTML,
    modern: {
      light: MODERN_LIGHT_HTML,
      dark: MODERN_DARK_HTML,
    },
    premium: {
      light: PREMIUM_LIGHT_HTML,
      dark: PREMIUN_DARK_HTML,
    },
    auth: {
      login: AUTH_HTML,
      register: WELCOME_HTML,
    },
    contact: CONTACT_HTML,
    error: ERROR_HTML,
    event: EVENT_HTML,
    networking: {
      event: {
        onboarding: NETWORK_EVENT_ONBOARDING_HTML,
        userOnboarding: NETWORK_USER_ONBOARDING_HTML,
        codeDisplay: NETWORK_CODE_DISPLAY_HTML,
        update: NETORK_EVENT_UPDATE_HTML,
      },
    },
  };
  if (!template) return null;
  const assetBucket = {
    AWS_BUCKET_NAME: `https://s3.us-west-2.amazonaws.com/${AWS_BUCKET_NAME}/templates/${template}/`,
  };
  if (template === 'error') {
    return Mustache.render(templates.error, {
      AWS_BUCKET_NAME: `https://s3.us-west-2.amazonaws.com/${AWS_BUCKET_NAME}/templates/basic/`,
    });
  }
  if (template === 'contact') {
    return Mustache.render(templates.contact, {
      ...assetBucket,
      ...data,
    });
  }
  if (template === 'event') {
    return Mustache.render(templates.event, {
      ...assetBucket,
      ...data,
    });
  }
  // refactor if statement into modern switch statement
  let html;
  if (template === 'login') {
    html = templates.auth.login;
  }
  if (template === 'welcome') {
    html = templates.auth.register;
  }
  if (template === 'basic') {
    html = templates.basic;
  }
  if (template === 'modern') {
    if (theme && theme === 'dark') {
      html = templates.modern.dark;
    } else {
      html = templates.modern.light;
    }
  }
  if (template === 'premium') {
    if (theme && theme === 'dark') {
      html = templates.premium.dark;
    } else {
      html = templates.premium.light;
    }
  }
  const networkingConfig = {
    AWS_BUCKET_NAME: `https://s3.us-west-2.amazonaws.com/${AWS_BUCKET_NAME}/templates/networking/`,
    SERVER_URL:
      ENVIRONMENT === 'prod' ? 'https://' + SERVER_URL : 'http://' + SERVER_URL,
  };

  if (template === 'networking-event-onboarding') {
    return Mustache.render(templates.networking.event.onboarding, {
      ...networkingConfig,
      ...data,
    });
  }
  if (template === 'networking-user-onboarding') {
    return Mustache.render(templates.networking.event.userOnboarding, {
      ...networkingConfig,
      ...data,
    });
  }
  if (template === 'networking-code-display') {
    return Mustache.render(templates.networking.event.codeDisplay, {
      ...networkingConfig,
      ...data,
      AWS_BUCKET_NAME: `${networkingConfig.AWS_BUCKET_NAME}code-display/`,
    });
  }
  if (template === 'networking-event-update') {
    return Mustache.render(templates.networking.event.update, {
      ...networkingConfig,
      ...data,
    });
  }

  if (!html) return null;
  return Mustache.render(html, {
    ...assetBucket,
    ...data,
  });
};
