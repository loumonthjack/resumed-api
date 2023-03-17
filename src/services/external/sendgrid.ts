import sendGrid from '@sendgrid/mail';

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
    const fromEmail = 'info@resumed.website';
    const msg = {
      to,
      from: fromEmail,
      subject,
      html: body,
    };
    return this.getInstance().send(msg);
  }
}

const Messenger = new Sendgrid();
export default Messenger;
