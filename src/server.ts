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

import {PORT, SUCCESS_RESPONSE, SERVER_URL} from './constants';
import {Middleware, authorize} from './services/auth';
import resolvers from './routes/graphql/index';
import typeDefs from './routes/graphql/schema';
import {cookieName, setCookies} from './routes/helper';
import {applyMiddleware} from 'graphql-middleware';
import shield from './routes/graphql/shield';

import AuthRoute from './routes/rest/auth';
import http from 'http';
import express from 'express';
import cors from 'cors';
import {isLocal} from './util/helper';

const expressServer = async () => {
  const app = express();
  const whitelist = ['http://localhost:3000', 'http://localhost:4000'];
  const corsOptions = {
    origin: function (origin: any, callback: any) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.urlencoded({extended: true}));

  app.get('/', (req, res) => {
    res.redirect('/graphql');
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
    plugins: [
      ApolloServerPluginLandingPageLocalDefault({
        embed: true,
        includeCookies: true,
      }),
      ApolloServerPluginInlineTrace(),
    ],
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
