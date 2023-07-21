import { CookieOptions } from "express";
export const isLocal = (): boolean => process.env.NODE_ENV === "localhost";
const isProd = (): boolean => process.env.NODE_ENV === "production";
const TOKEN_COOKIE_OPTIONS: CookieOptions = {
    domain: isLocal() ? undefined : ".resumed.website",
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
  };
export const cookieName = (name: string): string => {
    const env = isProd() ? "" : isLocal() ? "-local" : "-dev";

    return name + env;
};
export const getExpirationTime = (): Date => {
    return new Date(new Date().getTime() + 7200000);
  };
export const setCookies = (
    context: any,
    name: string,
    value: string | boolean,
    expiresIn?: string
  ) => {
    return context.cookies.push({
      name: cookieName(name),
      value: value || "",
      options: {
        ...TOKEN_COOKIE_OPTIONS,
        expires: getExpirationTime(),
      },
    });
  };
  