import sendGrid from '@sendgrid/mail';
import { AUTH_HTML, WELCOME_HTML, renderTemplate } from '../template';
import { FRONTEND_URL } from '../../constants';

class Sendgrid {
  private client;

  constructor() {
    this.client = sendGrid;
    this.client.setApiKey(process.env.SENDGRID_API_KEY || '');
  }

  public getInstance() {
    if (!this.client) {
      this.client = sendGrid;
      this.client.setApiKey(process.env.SENDGRID_API_KEY || '');
    }
    return this.client;
  }

  async sendEmail(to: string, subject: string, body: string) {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
    const msg = {
      to,
      from: fromEmail,
      subject,
      html: body,
    };
    return this.getInstance().send(msg);
  }
  loginUrl = (token: number) => `${FRONTEND_URL}/verify?code=${token.toString()}`
  async sendAuthEmail(to: string, token: number) {
    const success = this.sendEmail(to, "Your Auth Code From Resumed", renderTemplate(AUTH_HTML, { token, url: this.loginUrl(token) }))
    if (!success) throw new Error("Email could not be sent to" + to);
    return success;
  }
  async sendWelcomeEmail(to: string, token: number) {
    const success = this.sendEmail(to, "Welcome To Resumed", renderTemplate(WELCOME_HTML, { token, url: this.loginUrl(token), email: to, billingUrl: `${this.loginUrl(token)}&redirectTo=${FRONTEND_URL}/billing` }))
    if (!success) throw new Error("Email could not be sent to" + to);
    return success;
  }
}

const Messenger = new Sendgrid();
export default Messenger;
