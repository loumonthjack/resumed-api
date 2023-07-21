import { Authorize as Service } from '../../services/auth';
import { UserType } from '../../types';
import { setCookies } from '../helper';

const Auth = {
    login: async (
        _: unknown,
        args: {
            email: string;
        },
        context: any
    ): Promise<{
        success: boolean;
    }> => {
        const auth = await Service.login(args.email.toLowerCase());
        if (!auth.success) {
            throw new Error(auth.message);
        }
        return {
            success: auth.success,
        };
    },
    register: async (_: unknown, args: {
        email: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
    }, context: any): Promise<{
        user: UserType
    }> => {
        const response = await Service.register(args);
        if (!response.user) {
            throw new Error(response.message);
        }
        return {
            user: response.user
        }
    },
    verify: async (_: unknown, args: {
        email: string;
        code: string;
    }, context: any): Promise<{
        token: string;
    }> => {
        const response = await Service.verify(args);
        if (!response.token) {
            throw new Error(response.message);
        }
        setCookies(context, "resumed-token", response.token);
        return {
            token: response.token,
        }
    },
    logout: async (_: unknown, args: {
        email: string;
    }, context: any): Promise<{
        success: boolean;
    }> => {
        const response = await Service.logout(args.email.toLowerCase());
        if (!response.success) {
            throw new Error(response.message);
        }
        return {
            success: response.success,
        }
    },
};

export default Auth;
