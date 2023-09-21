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
