import {router as AuthRoute} from '../__init__';
import {Request, Response, Router} from 'express';
import {ERROR_RESPONSE as ERROR, ERROR_RESPONSE} from '../../../constants';
import {Authorize} from '../../../services/auth';
import {LogEvent} from '../../../util/logger';

const Register = (routeName: string): Router =>
  AuthRoute.post(routeName, async (request: Request, response: Response) => {
    const {email, firstName, lastName, profilePicture} = request.body;
    if (!email || !firstName || !lastName) {
      await LogEvent(
        400,
        'Auth',
        {
          message: ERROR_RESPONSE.MESSAGE.MISSING,
          code: 400,
        },
        request
      );
      return response.status(400).send(ERROR.MESSAGE.MISSING);
    }

    const auth = await Authorize.register({
      email: email.toLowerCase().trim(),
      firstName: firstName.toLowerCase().trim(),
      lastName: lastName.toLowerCase().trim(),
      profilePicture
  });
    await LogEvent(auth.code, 'Auth', auth, request);
    return response.status(auth.code).json({
      message: auth.message,
    });
  });

export default Register;
