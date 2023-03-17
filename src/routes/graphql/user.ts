import Service from '../../services/user';
import {UserType} from '../../types';
import {LogEvent} from '../../util/logger';

const User = {
  update: async (
    _: unknown,
    args: Omit<UserType, 'id'>,
    context: any
  ): Promise<UserType> => {
    const response = await Service.update({...args, id: context.userId});
    if (!response.user) {
      throw new Error(response.message);
    }
    return response.user;
  },
  get: async (_: unknown, args: UserType, context: any): Promise<UserType> => {
    const response = await Service.get(context.userId);
    if (!response.user) {
      throw new Error(response.message);
    }
    return response.user;
  },
};

export default User;
