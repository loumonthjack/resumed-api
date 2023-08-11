import { sendAuthEmail, sendMagicLink } from '../util/helper';
import jwt from 'jsonwebtoken';
import { ErrorResponse, SuccessResponse } from '../util/message';
import SessionDB from '../models/session';
import UserDB from '../models/user';
import BaseService from './base';
import Messenger from './external/sendgrid';
import ResumeDB from '../models/resume';

interface Response {
  message?: string;
  session?: {
    id: string;
    userId: string;
    code: string;
    verified: boolean;
    createdAt: Date;
    expiresAt: Date;
    token?: string;
  };
  code: number;
}

class SessionService extends BaseService<'SessionService'> {
  async create(
    userId: string,
    email: string,
    //firstTime: boolean | null
  ): Promise<Response> {
    const activeSession = await this.session(userId);
    if (activeSession.code === 200)
      return SuccessResponse({
        session: activeSession.session,
      });

    const code = Math.floor(100000 + Math.random() * 900000);
    const getUser = await UserDB.get(userId);
    if (!getUser) return ErrorResponse();

    const firstTime = getUser.lastLogin === null;
    if (!firstTime) {
      await Messenger.sendAuthEmail(email, code)
    } else {
      await Messenger.sendWelcomeEmail(email, code)
    }
    const resumeData = await ResumeDB.getByUserId(userId);
    if (resumeData) {
      await UserDB.update(userId, {
        ...getUser,
        isOnboarding: false,
      });
    }

    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    const session = await SessionDB.create({
      userId: userId,
      code: String(code),
      verified: false,
      createdAt: new Date(),
      expiresAt: expiration,
    });

    const user = await UserDB.get(userId);
    if (!user) return ErrorResponse();
    await UserDB.update(userId, {
      ...user,
      lastLogin: new Date(),
    });

    if (!session) return ErrorResponse();
    return this.response({ session: session });
  }

  async delete(userId: string): Promise<Response> {
    const activeSession = await this.session(userId);
    if (activeSession.code !== 200) return ErrorResponse('not_found');
    const session = await SessionDB.delete(activeSession.session?.id as string);
    if (!session) {
      return ErrorResponse();
    }
    return this.response({ session: session });
  }

  async verify(userId: string, code: string): Promise<Response> {
    const active = await this.session(userId);
    if (active.code !== 200) {
      return ErrorResponse('not_found');
    }

    if (active.session?.code !== code) {
      return ErrorResponse('invalid');
    }

    const expiration = new Date(active.session.expiresAt) < new Date();
    if (expiration) {
      return ErrorResponse('expired');
    }

    const session = await SessionDB.update(active.session.id, {
      ...active.session,
      verified: true,
    });

    const data = {
      time: Date(),
      userId: userId,
      code: code,
    };

    const token = jwt.sign(data, process.env.JWT_SECRET_KEY || '');

    if (!session) {
      return ErrorResponse();
    }
    return this.response({ session: { ...session, token } });
  }
  async session(userId: string): Promise<Response> {
    const session = await SessionDB.getByUserId(userId);
    if (!session) {
      return ErrorResponse('not_found');
    }
    return this.response({ session: session });
  }
  async getByToken(token: string): Promise<Response> {
    interface Token {
      time: string;
      userId: string;
      code: string;
    }
    const jwtSecretKey = process.env.JWT_SECRET_KEY || '';
    const data = jwt.verify(token, jwtSecretKey) as Token;
    const session = await SessionDB.getByCode(data.code);
    if (!session) {
      return ErrorResponse('not_found');
    }
    return this.response({ session: session });
  }
}

const Session = new SessionService();
export default Session;
