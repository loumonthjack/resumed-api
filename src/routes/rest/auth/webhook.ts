import {router as AuthRoute} from '../__init__';
import {Request, Response, Router} from 'express';
import Payment from '../../../services/payment';
import {LogEvent} from '../../../util/logger';

const Webhook = (routeName: string): Router =>
  AuthRoute.post(routeName, async (request: Request, response: Response) => {
    await LogEvent(
      200,
      'Payment',
      {
        message: 'Payment-Webhook-Transaction',
        code: 200,
      },
      request
    );
    return await Payment.webhookEvent(request, response);
  });

export default Webhook;
