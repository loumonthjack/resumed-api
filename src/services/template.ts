import path from 'path';
import fs from 'fs';
import Mustache from 'mustache';
import {AWS_BUCKET_NAME} from '../constants';

const BASE_PATH = '../templates';
export const AUTH_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/auth/login.html`))
  .toString();
export const WELCOME_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/auth/register.html`))
  .toString();

export const BASIC_LIGHT_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/basic/index-light.html`))
  .toString();
export const BASIC_DARK_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/basic/index-dark.html`))
  .toString();
export const MODERN_LIGHT_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/modern/index-light.html`))
  .toString();
export const MODERN_DARK_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/modern/index-dark.html`))
  .toString();
export const PREMIUM_LIGHT_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/premium/index-light.html`))
  .toString();
export const PREMIUN_DARK_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/premium/index-dark.html`))
  .toString();
export const ERROR_HTML = fs
  .readFileSync(path.join(__dirname, `${BASE_PATH}/error.html`))
  .toString();

export const renderTemplate = (
  template: string,
  data?: {
    [key: string]: any;
  },
  theme?: string
): string | null => {
  const templates = {
    basic: {
      light: BASIC_LIGHT_HTML,
      dark: BASIC_DARK_HTML,
    },
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
    error: ERROR_HTML,
  };
  if (!template) return null;
  if (!data) data = {};
  if (template === 'error') {
    return Mustache.render(templates.error, data);
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
    if (theme && theme === 'dark') {
      html = templates.basic.dark;
    } else {
      html = templates.basic.light;
    }
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
  if (!html) return null;
  return Mustache.render(html, data);
};
