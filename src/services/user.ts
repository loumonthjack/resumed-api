import UserDB from '../models/user';
import {UserType} from '../types';
import {DEFAULT_IMAGE} from '../util/helper';
import {ErrorResponse} from '../util/message';
import BaseService from './base';

interface Response {
  message?: string;
  user?: UserType;
  code: number;
}
class UserService extends BaseService<'UserService'> {
  async get(userId: string): Promise<Response> {
    const user = await UserDB.get(userId);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async getByEmail(email: string): Promise<Response> {
    const user = await UserDB.getByEmail(email);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async getAll(): Promise<Response> {
    const Users = await UserDB.getAll();
    if (!Users) return ErrorResponse();
    return this.response({user: Users});
  }
  async delete(userId: string): Promise<Response> {
    const user = await UserDB.delete(userId);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async getByExternalId(externalId: string): Promise<Response> {
    const user = await UserDB.getByExternalId(externalId);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async create(args: Omit<UserType, 'id'>): Promise<Response> {
    const user = await UserDB.create(args);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async update(args: UserType): Promise<Response> {
    const response = await this.get(args.id);
    if (!response.user) return ErrorResponse(response.message);
    const data = {
      firstName: response.user.firstName || '',
      lastName: response.user.lastName || '',
      email: response.user.email || '',
      profilePicture: response.user.profilePicture || DEFAULT_IMAGE || null,
      externalId: response.user.externalId || null,
      type: response.user.type || null,
      lastLogin: response.user.lastLogin || null,
    };
    if (args.firstName !== response.user.firstName) {
      data.firstName = args.firstName;
    }
    if (args.lastName !== response.user.lastName) {
      data.lastName = args.lastName;
    }
    if (args.email !== response.user.email) {
      data.email = args.email;
    }
    if (args.profilePicture !== response.user.profilePicture) {
      data.profilePicture = args.profilePicture;
    }
    if (args.externalId !== response.user.externalId) {
      data.externalId = args.externalId;
    }
    if (args.type !== response.user.type) {
      data.type = args.type;
    }
    const updatedUser = await UserDB.update(args.id, data);
    if (!updatedUser) return ErrorResponse();
    return this.response({user: updatedUser});
  }
}

const User = new UserService();
export default User;
