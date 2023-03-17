import Stripe from 'stripe';
import {STRIPE_SECRET_KEY} from '../../constants';

class StripeService {
  private static instance: StripeService;
  private client: Stripe;

  constructor() {
    this.client = new Stripe(STRIPE_SECRET_KEY || '', {
      apiVersion: '2022-11-15',
    });
  }
  public getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }
  public getSubscription(subscriptionId: string) {
    return this.client.subscriptions.retrieve(subscriptionId);
  }
  public getCustomer(customerId: string) {
    return this.client.customers.retrieve(customerId);
  }
}

const stripeService = new StripeService().getInstance();
export default stripeService;
