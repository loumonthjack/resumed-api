import {ApolloServer} from 'apollo-server-express';
import {rateLimitDirective} from 'graphql-rate-limit-directive';
import depthLimit from 'graphql-depth-limit';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {
  ApolloServerPluginInlineTrace,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
require('dotenv').config();

import {
  PORT,
  SUCCESS_RESPONSE,
  SERVER_URL,
  ALLOWED_ORIGINS,
  ENVIRONMENT,
  DEFAULT_IMAGE,
  AWS_BUCKET_NAME,
} from './constants';
import {Middleware, authorize} from './services/auth';
import resolvers from './routes/graphql/index';
import typeDefs from './routes/graphql/schema';
import {cookieName} from './routes/helper';
import {applyMiddleware} from 'graphql-middleware';
import shield from './routes/graphql/shield';

import AuthRoute from './routes/rest/auth';
import http from 'http';
import express from 'express';
import cors from 'cors';
import WebsiteDB from './models/website';
import {renderTemplate} from './services/template';
import UserDB from './models/user';
import ResumeDB from './models/resume';
import Messenger from './services/external/sendgrid';
import prisma from './models/prisma-client';
import {uploadEventLogo} from './services/external/aws';
const QRCode = require('qrcode');
const multipart = require('parse-multipart-data');

const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser');

const expressServer = async () => {
  const app = express();
  // Register '.html' extension with The Mustache Express
  app.engine('mustache', mustacheExpress());

  app.set('view engine', 'mustache');
  app.use(bodyParser.urlencoded({extended: true}));

  app.use((req, res, next) => {
    const resumedRegex = new RegExp(/.*resumed\.website$/);
    if (resumedRegex.test(req.hostname)) {
      res.setHeader('Access-Control-Allow-Origin', req.hostname);
    }
    next();
  });
  const websites = await WebsiteDB.getAll();
  if (!websites) return;

  const whiteList: Array<string> = ALLOWED_ORIGINS;
  for (const website of websites) {
    whiteList.push(website.url);
    if (website.alias) whiteList.push(website.alias);
  }
  const corsOptions = {
    origin: function (origin: any, callback: any) {
      if (!origin || whiteList.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
  // if URIError occurs, redirect to error page
  app.get('/', async (req, res) => {
    if (!req.hostname) {
      return res.status(404).send(renderTemplate('error'));
    }

    const website = await WebsiteDB.getByUrl('localhost');
    if (!website) {
      return res.status(404).send(renderTemplate('error'));
    }

    const websiteUser = await UserDB.get(website.userId);
    if (!websiteUser) {
      return res.status(404).send(renderTemplate('error'));
    }

    const resume = await ResumeDB.getByUserId(website.userId);
    if (!resume) {
      return null;
    }
    if (resume?.skills?.length > 5) {
      resume.skills = resume.skills.slice(0, 5);
    }
    // for each resume skill append percentNumber to the object
    resume.skills = resume.skills.map((skill: any) => {
      // percentNumber will be random from 75 to 100, increment of 5
      skill.percent = Math.floor(Math.random() * 5) * 5 + 75;
      return {
        ...skill,
        percentNumber: `${skill.percent}`,
      };
    });
    const experience = resume.experience && (resume.experience[0] as any);
    const newFile = renderTemplate(
      website.template.toLowerCase(),
      {
        resume,
        validClient: website.id,
        darkTheme: website.theme.toLowerCase() === 'dark' ? true : undefined,
        lightTheme: website.theme.toLowerCase() === 'light' ? true : undefined,
        isFreeUser: websiteUser.type === 'FREE' ? true : undefined,
        hasProfilePicture:
          websiteUser.profilePicture === DEFAULT_IMAGE ? true : undefined,
        hasResumeExperience: resume.experience !== undefined,
        hasResumeEducation: resume.education !== undefined,
        hasResumeSkills: resume.skills !== undefined,
        title:
          websiteUser.firstName.charAt(0).toUpperCase() +
          websiteUser.lastName.charAt(0).toUpperCase(),
        latestPosition: experience.position,
        headerFirst: websiteUser.firstName.toUpperCase(),
        headerLast: websiteUser.lastName.toUpperCase(),
        user: {
          ...websiteUser,
          firstName:
            websiteUser.firstName.charAt(0).toUpperCase() +
            websiteUser.firstName.slice(1),
          lastName:
            websiteUser.lastName.charAt(0).toUpperCase() +
            websiteUser.lastName.slice(1),
        },
        userResumeUrl: `https://s3.us-west-2.amazonaws.com/${AWS_BUCKET_NAME}/resumes/${website.userId}.pdf`,
        env: ENVIRONMENT,
        currentPostion: experience.position,
      },
      website.theme.toLowerCase()
    );
    // instead of sending the file, send the rendered html
    return res.send(newFile);
  });
  app.get('/health-check', (req, res) => {
    res.status(200).send('OK');
  });
  app.get('/networking/event', async (req, res) => {
    const event = renderTemplate('networking-event-onboarding');
    return res.send(event);
  });
  // create networking event
  const multer = require('multer');
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // no larger than 5mb
    },
  });
  app.post(
    '/networking/event',
    upload.single('fileupload'),
    async (req, res) => {
      if (!req.body) {
        return res.status(400).send('Missing event');
      }

      const eventName = req.body.name;
      const emailAddress = req.body.email;
      const eventLogo = req.file;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const type = req.body.captureType;
      const acceptTerms = req.body.terms;
      const theme = req.body.theme;
      if (!eventName || !startDate) {
        return res.status(400).send('Missing event name or duration');
      }
      const eventInfo = await prisma.event.findUnique({
        where: {
          name: eventName.toLowerCase(),
        },
      });
      if (eventInfo) {
        return res.redirect(`/networking/event?error=true&type=exists`);
      }
      let logo = null;
      if (eventLogo) {
        const upload = await uploadEventLogo(
          eventLogo.buffer,
          eventLogo.mimetype,
          `${eventName.toLowerCase()}-${startDate}`
        );
        if (!upload) {
          return res.status(500).send('Error uploading logo');
        }
        logo = upload;
      }
      const newEvent = await prisma.event.create({
        data: {
          name: eventName.toLowerCase(), // isRequired // identifier
          email: emailAddress, // isRequired
          logo: logo, // isOptional
          startDate: new Date(startDate) || new Date(), // isRequired
          endDate:
            new Date(endDate) || new Date().setDate(new Date().getDate() + 1), // isRequired
          type: type.toUpperCase() || 'EMAIL', // isRequired
          theme: theme ? theme.toUpperCase() : 'LIGHT', // isRequired
          terms: acceptTerms === 'Yes' || false, // isRequired
        },
      });
      if (!newEvent) {
        return res.status(500).send('Error creating event');
      }
      // send email to event organizer
      await Messenger.sendEventEmail(emailAddress, {
        event: {
          name: eventName.toLowerCase(),
          startDate: startDate,
          endDate: endDate,
        },
      });

      return res.redirect(`/networking/${newEvent.name}/user`);
    }
  );
  app.get('/event/purchase/:session', async (req, res) => {
    const session = req.params.session;
    // check if session exists in stripe

    return res.redirect(`/networking/event?success=true`);
    //&event=${event}`);
  });
  // show add QR code page
  app.get('/networking/:event/user', async (req, res) => {
    const event = req.params.event;
    if (!event) {
      return res.status(400).send('Missing event');
    }
    // url with be :event = eventName-startDate-endDate date in format YYYYMMDD (ex: mixercloud-20210101-20210102) or :event = eventName (ex: mixercloud)
    const eventInfo = await prisma.event.findUnique({
      where: {
        name: event,
      },
    });
    if (!eventInfo) {
      return res.status(400).send(renderTemplate('error'));
    }
    const eventAddCode = renderTemplate('networking-user-onboarding', {
      event: {
        ...eventInfo,
        linkedin: eventInfo.type?.toLowerCase() === 'linkedin',
        personal: eventInfo.type?.toLowerCase() === 'personal',
        both: eventInfo.type?.toLowerCase() === 'both',
        displayName: eventInfo.name.includes(' ')
          ? eventInfo.name[0].toUpperCase() +
            eventInfo.name.slice(1, eventInfo.name.indexOf(' ')) +
            ' ' +
            eventInfo.name[eventInfo.name.indexOf(' ') + 1].toUpperCase() +
            eventInfo.name.slice(eventInfo.name.indexOf(' ') + 2)
          : eventInfo.name[0].toUpperCase() + eventInfo.name.slice(1),
      },
    });
    return res.send(eventAddCode);
  });
  app.get('/networking/:event/:code', async (req, res) => {
    const event = req.params.event;
    const code = req.params.code;
    if (!event || !code) {
      return res.status(400).send('Missing event or code');
    }
    const eventInfo = await prisma.event.findUnique({
      where: {
        tempKey: code,
      },
    });
    if (!eventInfo) {
      return res.status(400).send(renderTemplate('error'));
    }
    if (eventInfo.tempKey !== code) {
      return res.status(400).send('Invalid code');
    }
    const eventAddCode = renderTemplate('networking-event-update', {
      event: {
        ...eventInfo,
        linkedin: eventInfo.type?.toLowerCase() === 'linkedin',
        personal: eventInfo.type?.toLowerCase() === 'personal',
        both: eventInfo.type?.toLowerCase() === 'both',
        displayName: eventInfo.name.includes(' ')
          ? eventInfo.name[0].toUpperCase() +
            eventInfo.name.slice(1, eventInfo.name.indexOf(' ')) +
            ' ' +
            eventInfo.name[eventInfo.name.indexOf(' ') + 1].toUpperCase() +
            eventInfo.name.slice(eventInfo.name.indexOf(' ') + 2)
          : eventInfo.name[0].toUpperCase() + eventInfo.name.slice(1),
      },
    });
    return res.send(eventAddCode);
  });
  app.post(
    '/networking/:event/:code',
    upload.single('fileupload'),
    async (req, res) => {
      const event = req.params.event;
      const code = req.params.code;
      if (!event || !code) {
        return res.status(400).send('Missing event or code');
      }
      const eventInfo = await prisma.event.findUnique({
        where: {
          tempKey: code,
        },
      });
      if (!eventInfo) {
        return res.status(40).send(renderTemplate('error'));
      }
      const eventName = req.body.name;
      const eventLogo = req.file;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      const type = req.body.captureType;
      const acceptTerms = req.body.terms;
      const theme = req.body.theme;
      let logo = null;
      if (eventLogo) {
        const upload = await uploadEventLogo(
          eventLogo.buffer,
          eventLogo.mimetype,
          `${eventName.toLowerCase()}-${startDate}`
        );
        if (!upload) {
          return res.status(500).send('Error uploading logo');
        }
        logo = upload;
      }
      console.log(logo);
      const data = {
        name: eventName ? eventName.toLowerCase() : eventInfo.name, // isRequired // identifier
        email: eventInfo.email, // isRequired
        logo: logo ? logo : eventInfo.logo, // isOptional
        startDate: startDate ? new Date(startDate) : eventInfo.startDate, // isRequired
        endDate: endDate ? new Date(endDate) : eventInfo.endDate,
        type: type ? type.toUpperCase() : eventInfo.type, // isRequired
        theme: theme ? theme.toUpperCase() : eventInfo.theme, // isRequired
        terms: acceptTerms ? acceptTerms === 'Yes' : eventInfo.terms, // isRequired
      };
      const updatedEvent = await prisma.event.update({
        where: {
          tempKey: code,
        },
        data,
      });
      if (!updatedEvent) {
        return res.status(500).send('Error updating event');
      }

      return res.redirect(
        `/networking/${updatedEvent.name}/${code}?success=true&event=${updatedEvent.name}`
      );
    }
  );
  // add QR code to networking event
  app.post('/networking/:event', async (req, res) => {
    let url = req.body.linkedInUrl || req.body.personalUrl;

    if (!url) {
      return res.status(400).send('Missing url');
    }
    const validTLDs = [
      '.com',
      '.net',
      '.org',
      '.edu',
      '.gov',
      '.mil',
      '.biz',
      '.info',
      '.me',
      '.io',
      '.co',
      '.website',
    ];
    // check if url has a valid tld
    if (req.body.personalUrl && !validTLDs.some(tld => url.includes(tld))) {
      return res.redirect(
        `/networking/${req.params.event}/user?error=true&type=tld`
      );
    }
    if (
      !url.includes('linkedin.com') &&
      // if url ends with a valid tld, dont add linkedin.com to the end
      !validTLDs.some(tld => url.endsWith(tld))
    ) {
      url = 'https://linkedin.com/in/' + url;
    }
    if (url.startsWith('http://') || url.startsWith('www.')) {
      url = url.replace('http://', 'https://');
      url = url.replace('www.', '');
    }
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }
    /*
    const blackListedUrls = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify({
          client: {
            clientId: 'resumed-website',
            clientVersion: '1.0.0',
          },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{url: url}],
          },
        }),
      }
    );
    if((blackListedUrls.matches.length > 0)) {
      return res.redirect(
        `/networking/${req.params.event}/user?error=true&type=blacklist`
      );
      }
    */
    const blackListedUrls = [
      'xvideos.com',
      'pornhub.com',
      'xnxx.com',
      'xhamster.com',
      'redtube.com',
      'youporn.com',
      't.co',
      'bit.ly',
      'tinyurl.com',
      'ow.ly',
      'is.gd',
      'buff.ly',
      'adf.ly',
      'goo.gl',
      'bit.do',
      'bc.vc',
      'j.mp',
      'tr.im',
      'tiny.cc',
      'cutt.us',
      'u.to',
      'rebrand.ly',
      'v.gd',
      'linktr.ee',
      'tiny.pl',
      'shorturl.at',
      'cli.re',
      'prettylinkpro.com',
      'viralurl.com',
      'bitly.com',
      'prettylink.com',
    ];

    if (
      blackListedUrls.includes(url) ||
      blackListedUrls.includes(url.slice(8))
    ) {
      return res.redirect(
        `/networking/${req.params.event}/user?error=true&type=blacklist`
      );
    }

    const newUrl = await prisma.eventAttendant.create({
      data: {
        url: url,
        eventId: req.params.event, // isRequired
      },
    });
    if (!newUrl) {
      return res.status(500).send('Error creating url');
    }
    return res.redirect(`/networking/${req.params.event}/user?success=true`);
  });
  app.get('/stat/:id', async (req, res) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).send('Missing id');
    }
    const attendant = await prisma.eventAttendant.findUnique({
      where: {
        id: id,
      },
    });
    if (!attendant) {
      return res.status(400).send('Attendant does not exist');
    }
    // get request  details from headers, be sure that one user cannot send multiple requests
    const headers = req.headers;
    const userAgent = headers['user-agent']?.toString();
    const referer = headers['referer']?.toString();
    const acceptLanguage = headers['accept-language']?.toString();
    const accept = headers['accept']?.toString();
    const forwarded = headers['forwarded']?.toString();
    const connection = headers['connection']?.toString();
    const host = headers['host']?.toString();
    const cookie = headers['cookie']?.toString();
    console.log(headers);
    if (!req.query.redirectTo) {
      return res.status(500).send('Error creating request');
    }
    return res.redirect(String(req.query.redirectTo));
  });

  // display QR codes for networking event
  app.get('/networking/:event', async (req, res) => {
    const event = req.params.event;
    if (!event) {
      return res.status(400).send('Missing event');
    }
    const eventInfo = await prisma.event.findUnique({
      where: {
        name: event,
      },
    });
    if (!eventInfo) {
      return res.status(400).send(renderTemplate('error'));
    }
    const eventAttendants = await prisma.eventAttendant.findMany({
      where: {
        eventId: event,
      },
    });
    if (!eventAttendants) {
      return res.status(400).send('Event could not be found');
    }
    const qrCodes = await Promise.all(
      eventAttendants.map(async (attendant: any) => {
        const qrCode = await QRCode.toDataURL(
          `http://${SERVER_URL}/stat/${attendant.id}?redirectTo=${attendant.url}`,
          {
            color: {dark: '#000', light: '#fff'},
            width: 100,
            maskPattern: 1,
            height: 100,
            margin: 0,
            scale: 10,
            quality: 1,
          }
        );
        return {
          url: `${SERVER_URL}/stat/${attendant.id}?redirectTo=${attendant.url}`,
          qrCode: qrCode,
        };
      })
    );
    // if event attendees is greater than 1, return qr code and qr codes as null
    if (qrCodes.length > 1) {
      const eventCodes = renderTemplate('networking-code-display', {
        qrCodes: qrCodes,
        event: {
          logo: eventInfo.logo,
          name: event,
          // if event is two words, capitalize both words, check for spaces
          displayName: event.includes(' ')
            ? event[0].toUpperCase() +
              event.slice(1, event.indexOf(' ')) +
              ' ' +
              event[event.indexOf(' ') + 1].toUpperCase() +
              event.slice(event.indexOf(' ') + 2)
            : event[0].toUpperCase() + event.slice(1),
        },
      });
      return res.send(eventCodes);
    } else if (qrCodes.length === 0) {
      const eventCode = renderTemplate('networking-code-display', {
        message: 'Unfortunately, no one has joined this event yet.',
        event: {
          logo: eventInfo.logo,
          name: event,
          displayName: event.includes(' ')
            ? event[0].toUpperCase() +
              event.slice(1, event.indexOf(' ')) +
              ' ' +
              event[event.indexOf(' ') + 1].toUpperCase() +
              event.slice(event.indexOf(' ') + 2)
            : event[0].toUpperCase() + event.slice(1),
        },
      });
      return res.send(eventCode);
    }
    const eventCode = renderTemplate('networking-code-display', {
      qrCode: qrCodes[0],
      event: {
        logo:
          eventInfo.logo ||
          'https://s3.amazonaws.com/app.resumed.website/Logo-Only.png',
        name: event,
        displayName: event.includes(' ')
          ? event[0].toUpperCase() +
            event.slice(1, event.indexOf(' ')) +
            ' ' +
            event[event.indexOf(' ') + 1].toUpperCase() +
            event.slice(event.indexOf(' ') + 2)
          : event[0].toUpperCase() + event.slice(1),
      },
    });
    return res.send(eventCode);
  });
  app.post('/send-email', async (req, res) => {
    const headers = req.headers;
    if (!headers['x-valid-client']) {
      return res.status(400).send('Missing X-Valid-Client header');
    }
    const website = await WebsiteDB.getById(
      headers['x-valid-client']?.toString()
    );
    if (!website) {
      return res.status(400).send('Invalid X-Valid-Client header');
    }
    const email = req.body.email;
    const message = req.body.message;
    const subject = req.body.subject;
    if (!email || !message || !subject) {
      return res.status(400).send('Missing email, message, or subject');
    }
    const emailSent = await Messenger.sendContactEmail({
      domain: req.hostname,
      email: String(email),
      message: String(message),
      subject: String(subject),
    });
    if (!emailSent) {
      return res.status(500).send('Error sending email');
    }
    return res.status(200).send(true);
  });

  app.use(AuthRoute.webhook);

  setInterval(Middleware.removeInvalidSessions, 1000 * 60 * 1);

  return app;
};

// health check endpoint -- /.well-known/apollo/server-health
async function apolloServer(app: any, typeDefs: any, resolvers: any) {
  const httpServer = http.createServer(app);

  const {rateLimitDirectiveTypeDefs, rateLimitDirectiveTransformer} =
    rateLimitDirective();
  const schema = makeExecutableSchema({
    typeDefs: [typeDefs, rateLimitDirectiveTypeDefs],
    resolvers,
  });
  const graphQLServer = new ApolloServer({
    schema: applyMiddleware(rateLimitDirectiveTransformer(schema), shield),
    validationRules: [depthLimit(3)],
    csrfPrevention: true,
    cache: 'bounded',
    context: async ({req, res}) => {
      let token: string | undefined;
      const cookieTokenName = cookieName('resumed-token');
      if (req.headers.authorization !== undefined) {
        token = req.headers.authorization.substring('Bearer '.length);
      } else if (
        req.headers.cookie?.includes(cookieTokenName) ||
        (req.cookies && req.cookies[cookieTokenName] !== undefined)
      ) {
        if (req.headers.cookie?.includes(cookieTokenName)) {
          token = req.headers.cookie
            ?.split(';')
            .find((c: any) => c.trim().startsWith(cookieTokenName))
            ?.split('=')[1];
        } else {
          token = req.cookies[cookieTokenName];
        }
      }
      const session = await authorize(token, req.body.query);
      return {
        req,
        res,
        token,
        session,
        cookies: [],
        setCookies: [], // do not work with multiple cookies
        setHeaders: [],
      };
    },
    formatResponse: (response, requestContext: any) => {
      const cookies = requestContext.context.cookies;
      for (const cookie of cookies) {
        requestContext.context.res.cookie(
          cookie.name,
          cookie.value,
          cookie.options
        );
      }

      return response;
    },
    plugins:
      ENVIRONMENT !== 'prod'
        ? [
            ApolloServerPluginInlineTrace(),
            ApolloServerPluginLandingPageLocalDefault({
              embed: true,
              includeCookies: true,
            }),
          ]
        : [],
  });
  await graphQLServer.start();
  graphQLServer.applyMiddleware({app, path: '/graphql', cors: false});
  app.all('*', (req: any, res: any) => {
    return res.status(404).send(renderTemplate('error'));
  });
  await new Promise<void>(resolve => httpServer.listen({port: PORT}, resolve));
  console.log(SUCCESS_RESPONSE.MESSAGE.RUNNING(`🚀http://${SERVER_URL}/`));
}
async function startApolloServer(typeDefs: any, resolvers: any) {
  await apolloServer(await expressServer(), typeDefs, resolvers);
}
startApolloServer(typeDefs, resolvers);
