import {CookieOptions} from 'express';
import {isDev, isLocal} from '../util/helper';

const TOKEN_COOKIE_OPTIONS: CookieOptions = {
  domain: isLocal ? 'localhost' : '.resumed.website',
  httpOnly: true,
  path: '/',
  sameSite: 'none',
  secure: true,
};
export const cookieName = (name: string): string => {
  const env = isLocal ? '-local' : isDev ? '-dev' : '';

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
