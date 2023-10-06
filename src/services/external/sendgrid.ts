import sendGrid from '@sendgrid/mail';
import {AUTH_HTML, WELCOME_HTML, renderTemplate} from '../template';
import {ENVIRONMENT, FRONTEND_URL, SERVER_URL} from '../../constants';
import WebsiteDB from '../../models/website';
import UserDB from '../../models/user';
import prisma from '../../models/prisma-client';

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
  loginUrl = (token: number, to: string) =>
    `http://${FRONTEND_URL}/verify?email=${to}&code=${token.toString()}`;
  async sendAuthEmail(to: string, token: number) {
    const template = renderTemplate('login', {
      token,
      url: this.loginUrl(token, to),
    });
    if (!template) throw new Error('Template could not be rendered');
    const success = this.sendEmail(to, 'Sign In for Resumed', template);
    if (!success) throw new Error('Email could not be sent to' + to);
    return success;
  }
  async sendWelcomeEmail(to: string, token: number) {
    const template = renderTemplate('welcome', {
      token,
      url: this.loginUrl(token, to),
      email: to,
    });
    if (!template) throw new Error('Template could not be rendered');
    const success = this.sendEmail(to, 'Activate Your Account', template);
    if (!success) throw new Error('Email could not be sent to' + to);
    return success;
  }
  async sendEventEmail(
    to: string,
    data: {
      event: {
        name: string;
        startDate: string;
        endDate: string;
      };
    }
  ) {
    const generateTenDigitCode = () => {
      const code = Math.floor(1000000000 + Math.random() * 9000000000);
      return code.toString().substring(0, 10);
    };
    // update event with code
    const code = generateTenDigitCode();
    const event = await prisma.event.update({
      where: {
        name: data.event.name,
      },
      data: {
        tempKey: code,
      },
    });
    if (!event) throw new Error('Event could not be found');
    const template = renderTemplate('event', {
      event: data.event,
      authKey: event.tempKey,
      SERVER_URL:
        ENVIRONMENT === 'prod'
          ? 'https://' + SERVER_URL
          : 'http://' + SERVER_URL,
    });
    if (!template) throw new Error('Template could not be rendered');
    const success = this.sendEmail(
      to,
      'Your event has been created on Resumed',
      template
    );
    if (!success) throw new Error('Email could not be sent to' + to);
    return success;
  }
  async sendContactEmail(data: {
    domain: string;
    email: string;
    message: string;
    subject: string;
  }) {
    const template = renderTemplate('contact', {
      message: data.message,
      email: data.email,
      subject: data.subject,
    });
    const getWebsiteUser = async () => {
      const website = await WebsiteDB.getByUrl(data.domain);
      if (!website) return null;
      const user = await UserDB.get(website.userId);
      if (!user) return null;
      return user;
    };
    if (!template) throw new Error('Template could not be rendered');
    const user = await getWebsiteUser();
    if (!user) throw new Error('User could not be found');
    const success = this.sendEmail(
      user.email,
      `Resumed: ${data.subject} sent you an message on your website.`,
      template
    );
    if (!success) throw new Error('Email could not be sent to' + user.email);
    return success;
  }
}

const Messenger = new Sendgrid();
export default Messenger;
