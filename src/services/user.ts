import UserDB from '../models/user';
import {UserType} from '../types';
import {DEFAULT_IMAGE} from '../util/helper';
import {ErrorResponse} from '../util/message';
import BaseService from './base';

interface Response {
  message?: string;
  user?: UserType;
  users?: UserType[];
  code: number;
}
class UserService extends BaseService<'UserService'> {
  async get(userId: string): Promise<Response> {
    const user = await UserDB.get(userId);
    if (!user) return ErrorResponse();
    return this.response({user: user});
  }
  async getByFirstAndLastName(firstName: string, lastName: string): Promise<Response> {
    const users = await UserDB.getByFirstAndLastName(firstName, lastName);
    if (!users) return ErrorResponse();
    return this.response({users});
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
    
    const updatedUser = await UserDB.update(args.id, {
      ...response,
      ...args
    });
    if (!updatedUser) return ErrorResponse();
    return this.response({user: updatedUser});
  }
}

const User = new UserService();
export default User;
