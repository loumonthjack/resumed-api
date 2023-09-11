import {ApolloServer} from 'apollo-server-express';
import {expressMiddleware} from '@apollo/server/express4';
import serverlessExpress from '@vendia/serverless-express';
import {rateLimitDirective} from 'graphql-rate-limit-directive';
import depthLimit from 'graphql-depth-limit';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {
  ApolloServerPluginInlineTrace,
  ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core';
require('dotenv').config();

import {PORT, SUCCESS_RESPONSE, SERVER_URL, FRONTEND_URL} from './constants';
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
import {isDev, isLocal} from './util/helper';
import WebsiteDB from './models/website';
import {
  BASIC_HTML,
  MINIMAL_HTML,
  MODERN_HTML,
  renderTemplate,
} from './services/template';
import UserDB from './models/user';
import ResumeDB from './models/resume';
import path from 'path';
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser');

const expressServer = async () => {
  const app = express();
  // Register '.html' extension with The Mustache Express
  app.engine('mustache', mustacheExpress());

  app.set('view engine', 'mustache');
  app.use(express.static(path.join(__dirname + '../templates/basic')));
  console.log(path.join(__dirname + '../templates/basic'));
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

  const whiteList: Array<string> = [
    'http://localhost:3000',
    'http://localhost:4000',
    SERVER_URL,
    'https://api.dev.resumed.website',
    FRONTEND_URL,
  ];
  for (const website of websites) {
    whiteList.push(website.url);
    if (website.alias) whiteList.push(website.alias);
  }
  console.log(whiteList);
  const corsOptions = {
    origin: function (origin: any, callback: any) {
      if (!origin || whiteList.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(origin, whiteList);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));
  app.get('/', async (req, res) => {
    // check if website exist in db
    console.log(req.hostname);
    if (!req.hostname) {
      return res.status(404).send(`<html>
      <head>
        <title>404</title>
      </head>
      <body>
        <h1>404</h1>
        <p>Website not found</p>
      </body>
    </html>`);
    }
    const website = await WebsiteDB.getByUrl(req.hostname);
    if (!website) {
      return res.status(404).send(`<html>
      <head>
        <title>404</title>
      </head>
      <body>
        <h1>404</h1>
        <p>Website not found</p>
      </body>
    </html>`);
    }
    const templates: any = {
      basic: BASIC_HTML,
      minimal: MINIMAL_HTML,
      modern: MODERN_HTML,
    };
    const websiteUser = await UserDB.get(website.userId);
    if (!websiteUser) {
      return res.status(404).send(`<html>
      <head>
        <title>404</title>
      </head>
      <body>
        <h1>404</h1>
        <p>Something went wrong</p>
      </body>
    </html>`);
    }
    // first letter of first name and last name
    const title = `${websiteUser.firstName
      .charAt(0)
      .toUpperCase()}${websiteUser.lastName.charAt(0).toUpperCase()}`;
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
    const newFile = renderTemplate(templates[website.template.toLowerCase()], {
      title,
      user: websiteUser,
      resume,
      currentPostion: experience.position,
      lightBackground: website.theme === 'light',
    });
    return res.render(newFile);
  });
  app.get('/health-check', (req, res) => {
    res.status(200).send('OK');
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
      isLocal || isDev
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
  graphQLServer.applyMiddleware({app: app, path: '/graphql', cors: false});
  await new Promise<void>(resolve => httpServer.listen({port: PORT}, resolve));
  console.log(SUCCESS_RESPONSE.MESSAGE.RUNNING(`🚀${SERVER_URL}/`));
}
async function startApolloServer(typeDefs: any, resolvers: any) {
  await apolloServer(await expressServer(), typeDefs, resolvers);
}
startApolloServer(typeDefs, resolvers);
