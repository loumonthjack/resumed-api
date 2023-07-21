import {router as AuthRoute} from '../__init__';
import {Request, Response, Router} from 'express';
import {ERROR_RESPONSE as ERROR, ERROR_RESPONSE} from '../../../constants';
import {Authorize} from '../../../services/auth';
import {LogEvent} from '../../../util/logger';

const Verify = (routeName: string): Router =>
  AuthRoute.post(routeName, async (request: Request, response: Response) => {
    const {email, code} = request.body;
    if (!email || !code) {
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

    const auth = await Authorize.verify({email:email.toLowerCase(), code:code});
    await LogEvent(auth.code, 'Auth', auth, request);
    // set cookies 
    const token = auth.token
    if (!token) return response.status(500).json({message: ERROR.MESSAGE.GENERIC});
    return response
      .status(auth.code)
      .json({message: auth.message, token});
  });

export default Verify;
