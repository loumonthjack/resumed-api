import path from 'path';
const fse = require('fs-extra');
import {Configuration, OpenAIApi} from 'openai';
import {
  AWS_ACCESS_KEY_ID,
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  DOMAIN_NAME,
  FRONTEND_URL,
  NODE_ENV,
  OPENAI_KEY,
  STRIPE_BILLING_PORTAL,
  STRIPE_SECRET_KEY,
} from '../constants';
import AWS from 'aws-sdk';
import {UserType} from '../types';
import axios from 'axios';
import sendGrid from '@sendgrid/mail';

sendGrid.setApiKey(process.env.SENDGRID_API_KEY || '');
const MAILER = process.env.SENDGRID_FROM_EMAIL || '';

export const config = {
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION || 'us-east-2',
};

const Stripe = require('stripe');
export const stripe = Stripe(process.env.STRIPE_SECRET_KEY_TEST || '');

export const s3 = new AWS.S3(config);
export const route53 = new AWS.Route53({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});
export const cloudfront = new AWS.CloudFront(config);
export const cloudwatch = new AWS.CloudWatchLogs(config);
export const acm = new AWS.ACM({...config, region: 'us-eat-1'});
export const route53domains = new AWS.Route53Domains({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
});

const ai = new OpenAIApi(
  new Configuration({
    apiKey: OPENAI_KEY,
  })
);

export const getFileType = async (filePath: string) => {
  const fileExtension = path.extname(filePath);
  switch (fileExtension) {
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'text/javascript';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'text/plain';
  }
};

export const isDirectory = async (filePath: string) => {
  const stats = await fse.stat(filePath);
  return stats.isDirectory();
};

export const makeAiRequest = (prompt: string) => {
  const response: any = ai
    .createCompletion({
      model: 'text-davinci-002',
      prompt: prompt,
      temperature: 0.7,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    })
    .then(data => {
      if (data.status === 200) {
        return data.data.choices?.[0].text;
      }
      return data;
    });
  return response as string;
};

export const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

export const sendAuthEmail = async (email: string, code: number) => {
  const msg = {
    to: email,
    from: MAILER,
    subject: 'Your Resumed Verification Code is ' + String(code),
    text: `Your verification code is ${code.toString()}`,
    html: `<p>Hi there,<br/><br/>

    Your one-time login passcode is <strong>${code.toString()}</strong>. It will expire in 10 minutes.<br/>
    <br/>
    
    Thank you,
    <br/><br/>
    Resumed Team</p>`,
  };
  return await sendGrid.send(msg);
};

export const sendMagicLink = async (email: string, code: number) => {
  const msg = {
    to: email,
    from: MAILER,
    subject: 'Your Resumed Magic Link',
    text: `Your magic link is ${FRONTEND_URL}/login?email=${email}&code=${code.toString()}`,
    html: `<p>Hi there,<br/><br/>

    Your magic link is <a href="${FRONTEND_URL}/login?email=${email}&code=${code.toString()}">${FRONTEND_URL}/login?email=${email}&code=${code.toString()}</a>. It will expire in 10 minutes.<br/>
    <br/>

    To manage you billing, go to <a href="${STRIPE_BILLING_PORTAL}/billing">Billing</a>.<br/>

    Thank you,
    <br/><br/>
    Resumed Team</p>`,
  };
  const emailSent = await sendGrid.send(msg);
  if (!emailSent) return false;
  return true;
};

export const sendContactEmail = async (email: string, message: string) => {
  const msg = {
    to: email,
    from: MAILER,
    subject: 'Someone sent you a message from Resumed Website',
    text: `Someone sent you a message from Resumed Website. Here is the message: ${message}`,
    html: `<p>Hi there,<br/><br/>

    Someone sent you a message from Resumed Website. Here is the message: ${message}<br/>
    <br/>
    
    Thank you,
    <br/><br/>
    Resumed Team</p>`,
  };
  const emailSent = await sendGrid.send(msg);
  if (!emailSent) return false;
  return true;
};

export const uploadImage = async (file: string, userId: UserType['id']) => {
  if (!file) {
    return null;
  }
  const type = file.split(';')[0].split('/')[1];
  return (
    await s3
      .upload({
        Bucket: AWS_BUCKET_NAME,
        Key: `profile_pics/${userId}.${type}`,
        ContentType: `image/${type}`,
        ContentEncoding: 'base64',
        Body: Buffer.from(
          file.replace(/^data:image\/\w+;base64,/, ''),
          'base64'
        ),
      })
      .promise()
  ).Location;
};

export const generateHeadline = async () => {
  const quote = await axios.get('https://type.fit/api/quotes');
  const randomQuote = quote.data[Math.floor(Math.random() * quote.data.length)];
  const headline = `${randomQuote.text} - ${randomQuote.author}`;
  return headline;
};

export const generateRandomImage = async () => {
  const image = await axios.get('https://source.unsplash.com/random');
  return image.data;
};
