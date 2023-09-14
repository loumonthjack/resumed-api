import {CookieOptions} from 'express';
import {DOMAIN_NAME, ENVIRONMENT} from '../constants';

const TOKEN_COOKIE_OPTIONS: CookieOptions = {
  domain: ENVIRONMENT === 'local' ? 'localhost' : `.${DOMAIN_NAME}`,
  httpOnly: true,
  path: '/',
  sameSite: 'none',
  secure: true,
};
export const cookieName = (name: string): string => {
  const env = ENVIRONMENT !== 'prod' ? `-${ENVIRONMENT}` : '';

  return name + env;
};
export const getExpirationTime = (): Date => {
  // set time to 1 day
  const time = 1000 * 60 * 60 * 24;
  return new Date(Date.now() + time);
};
export const setCookies = (
  context: any,
  name: string,
  value: string | boolean,
  expiresIn?: string
) => {
  return context.cookies.push({
    name: cookieName(name),
    value: value || '',
    options: {
      ...TOKEN_COOKIE_OPTIONS,
      expires: getExpirationTime(),
    },
  });
};
