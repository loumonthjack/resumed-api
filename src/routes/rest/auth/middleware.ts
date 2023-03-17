import {router as AuthRoute} from '../__init__';
import {Request, Response, Router} from 'express';
import {ERROR_RESPONSE as ERROR, ERROR_RESPONSE} from '../../../constants';
import {Authorize} from '../../../services/auth';
import {LogEvent} from '../../../util/logger';

const Check = (routeName: string): Router =>
  AuthRoute.post(routeName, async (request: Request, response: Response) => {
    const {email} = request.body;
    if (!email) {
      await LogEvent(
        400,
        'Auth',
        {
          message: ERROR_RESPONSE.MESSAGE.MISSING,
          code: 400,
        },
        request
      );
      return response.status(400).json({message: ERROR.MESSAGE.MISSING});
    }

    const auth = await Authorize.checkSession(email.toLowerCase().trim());
    return response.status(auth.code).json({message: auth.message});
  });

export default Check;
