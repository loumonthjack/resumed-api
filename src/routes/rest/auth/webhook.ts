import {router as AuthRoute} from '../__init__';
import {Request, Response, Router} from 'express';
import Payment from '../../../services/payment';

const Webhook = (routeName: string): Router =>
  AuthRoute.post(routeName, async (request: Request, response: Response) => {
    return await Payment.webhookEvent(request, response);
  });

export default Webhook;
