import Service from '../../services/user';
import { UserType } from '../../types';

const User = {
  update: async (
    _: unknown,
    args: Omit<UserType, 'id'>,
    context: any
  ): Promise<UserType> => {
    const response = await Service.update({ ...args, id: context.session.userId });
    if (!response.user) {
      throw new Error(response.message);
    }
    return response.user;
  },
  get: async (_: unknown, args: UserType, context: {session: { userId : string}}): Promise<UserType> => {
    const response = await Service.get(context.session.userId);
    if (!response.user) {
      throw new Error(response.message);
    }
    return response.user;
  },
};

export default User;
