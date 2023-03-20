import {Request, Response as ExpressResponse, NextFunction} from 'express';
import {isLocal, uploadImage, DEFAULT_IMAGE} from '../util/helper';
import {ErrorResponse, SuccessResponse} from '../util/message';
import {LogEvent} from '../util/logger';
import {SessionType} from '../types';

import Session from './session';
import Payment from './payment';
import User from './user';
import SessionDB from '../models/session';
import {AuthenticationError} from 'apollo-server-core';
import {ERROR_RESPONSE as ERROR} from '../constants';
import BaseService from './base';

interface Response {
  message?: string;
  code: number;
  token?: string;
}

class AuthService extends BaseService<'AuthService'> {
  async register(
    email: string,
    firstName: string,
    lastName: string,
    profilePicture: string
  ): Promise<Response> {
    const oldUser = await User.getByEmail(email);
    if (oldUser) {
      return ErrorResponse('already_exist', 'User');
    }
    const response = await User.create({
      email: email,
      firstName: firstName,
      lastName: lastName,
      profilePicture: DEFAULT_IMAGE,
      externalId: null,
      lastLogin: new Date(),
      type: '',
    });
    if (!response.user) {
      return ErrorResponse();
    }
    if (profilePicture) {
      const profileImage =
        (await uploadImage(profilePicture, response.user.id)) || DEFAULT_IMAGE;
      await User.update({
        ...response.user,
        profilePicture: profileImage,
      });
    }
    return this.response({
      user: response.user,
    });
  }

  async login(email: string): Promise<Response> {
    const activeUser = await User.getByEmail(email);
    if (!activeUser.user) {
      return ErrorResponse('not_found');
    }
    await Payment.checkSubscription(activeUser.user.id);
    const response = await Session.create(activeUser.user.id, email, null);
    if (response.code !== 200) {
      return ErrorResponse();
    }
    return this.response({login: true, user: activeUser.user});
  }
  async verify(email: string, code: string): Promise<Response> {
    const activeUser = await User.getByEmail(email);
    if (!activeUser.user) {
      return ErrorResponse('not_found');
    }
    const response = await Session.verify(activeUser.user.id, code);
    if (response.code !== 200) {
      return ErrorResponse('unauthorized');
    }
    return this.response({token: response.session?.token});
  }

  async logout(email: string): Promise<Response> {
    const active = await User.getByEmail(email);
    if (!active.user) {
      return ErrorResponse('not_found');
    }
    const activeSession = await SessionDB.get(active.user.id);
    if (!activeSession) {
      return ErrorResponse('not_found');
    }
    const expired = new Date(activeSession.expiresAt) < new Date();
    if (expired) {
      return ErrorResponse('expired');
    }
    const session = await SessionDB.delete(activeSession.id);
    if (!session) {
      return ErrorResponse();
    }
    return this.response({logout: true});
  }

  async checkSession(
    email: string
  ): Promise<{message?: boolean; code: number}> {
    const response = await User.getByEmail(email);
    if (!response.user) {
      return {message: false, code: 200};
    }
    const session = await SessionDB.get(response.user.id);
    if (!session) {
      return {message: false, code: 200};
    }
    return {message: true, code: 200};
  }

  async checkAuthorization(authToken: string | null): Promise<Response> {
    if (!authToken) {
      return ErrorResponse('unauthorized');
    }
    const response = await Session.getByToken(authToken);
    if (response.code !== 200) {
      return ErrorResponse('unauthorized');
    }

    const expiration = new Date(response.session?.expiresAt as Date);
    if (expiration < new Date()) {
      const deleteSession = await Session.delete(
        response.session?.userId as string
      );
      if (deleteSession.code !== 200) {
        return ErrorResponse();
      }
      return this.response({token: response.session?.token});
    }

    if (response.session?.verified === true) {
      return this.response({token: response.session?.token});
    } else {
      return ErrorResponse('unauthorized');
    }
  }

  async removeInvalidSessions(): Promise<void> {
    const sessions = await SessionDB.getAll();
    if (!sessions) {
      return;
    }
    sessions.forEach(
      async (session: {
        createdAt: string | number | Date;
        expiresAt: string | number | Date;
        id: string;
        verified: boolean;
      }) => {
        const expiration = new Date(session.expiresAt);
        if (expiration < new Date()) {
          await SessionDB.delete(session.id);
        }
        const creation = new Date(session.createdAt);
        const now = new Date();
        const diff = now.getTime() - creation.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes > 10 && session.verified === false) {
          await SessionDB.delete(session.id);
        }
      }
    );
    return;
  }

  async removeSession(session: SessionType): Promise<boolean> {
    const expiration = new Date(session.expiresAt);
    if (expiration < new Date()) {
      await SessionDB.delete(session.id);
      return true;
    }
    return false;
  }
}

export const Authorize = new AuthService();

class MiddlewareService {
  checkAuth = async (
    request: Request,
    response: ExpressResponse,
    next: NextFunction
  ) => {
    if (isLocal) return next();
    const {authorization} = request.headers;
    const auth = await Authorize.checkAuthorization(authorization as string);
    if (auth.code !== 200) {
      return response.status(auth.code).json({message: auth.message});
    }
    next();
  };
  removeInvalidSessions = async () => {
    await Authorize.removeInvalidSessions();
  };
  removeUserSession = async (session: any) => {
    return await Authorize.removeSession(session);
  };
}
export const Middleware = new MiddlewareService();

export const authorizeSession = async (
  AuthHeader: string
): Promise<SessionType | undefined> => {
  const auth = await Session.getByToken(AuthHeader);
  if (auth.code !== 200)
    throw new AuthenticationError(ERROR.MESSAGE.UNAUTHORIZED);
  if (await Middleware.removeUserSession(auth.session))
    throw new AuthenticationError(ERROR.MESSAGE.EXPIRED);
  if (auth.session?.verified === false)
    throw new AuthenticationError(ERROR.MESSAGE.UNAUTHORIZED);
  return auth.session;
};